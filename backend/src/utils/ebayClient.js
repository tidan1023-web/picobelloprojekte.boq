'use strict';
const axios = require('axios');
const logger = require('./logger');

const EBAY_SANDBOX = process.env.EBAY_SANDBOX === 'true';
const EBAY_BASE_URL = EBAY_SANDBOX
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com';
const EBAY_AUTH_URL = EBAY_SANDBOX
  ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
  : 'https://auth.ebay.com/oauth2/authorize';
const EBAY_TOKEN_URL = EBAY_SANDBOX
  ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
  : 'https://api.ebay.com/identity/v1/oauth2/token';

const MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
const MERCHANT_LOCATION_KEY = process.env.EBAY_MERCHANT_LOCATION_KEY || 'warehouse_main';

// ---- Error helpers ----

function parseEbayError(err) {
  if (!err.response) return err;
  const errors = err.response?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const msg = errors.map((e) => `[${e.errorId}] ${e.message}`).join('; ');
    const custom = new Error(`eBay API error: ${msg}`);
    custom.statusCode = err.response.status;
    custom.isOperational = true;
    custom.ebayErrors = errors;
    return custom;
  }
  if (err.response.data?.error_description) {
    const custom = new Error(`eBay Auth error: ${err.response.data.error_description}`);
    custom.statusCode = err.response.status;
    custom.isOperational = true;
    return custom;
  }
  return err;
}

// Exponential backoff retry wrapper — retries on 5xx and 429, not on 4xx client errors
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 1000) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const isRetryable = !status || status >= 500 || status === 429;
      if (!isRetryable || attempt === maxAttempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      logger.warn('eBay API call failed, retrying', {
        attempt,
        maxAttempts,
        delayMs: delay,
        error: err.message,
        status,
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw parseEbayError(lastErr);
}

// ---- OAuth ----

function getCredentialsHeader() {
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) throw new Error('EBAY_APP_ID and EBAY_CERT_ID must be set');
  return `Basic ${Buffer.from(`${appId}:${certId}`).toString('base64')}`;
}

function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.EBAY_APP_ID,
    redirect_uri: process.env.EBAY_REDIRECT_URI,
    response_type: 'code',
    scope: [
      'https://api.ebay.com/oauth/api_scope',
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
    ].join(' '),
    state,
  });
  return `${EBAY_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const response = await withRetry(() =>
    axios.post(
      EBAY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.EBAY_REDIRECT_URI,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: getCredentialsHeader(),
        },
      }
    )
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
    scope: response.data.scope?.split(' ') || [],
  };
}

async function refreshAccessToken(refreshToken) {
  const response = await withRetry(() =>
    axios.post(
      EBAY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: [
          'https://api.ebay.com/oauth/api_scope/sell.inventory',
          'https://api.ebay.com/oauth/api_scope/sell.account',
          'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
        ].join(' '),
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: getCredentialsHeader(),
        },
      }
    )
  );

  return {
    accessToken: response.data.access_token,
    expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
  };
}

// ---- API client factory ----

function createEbayClient(accessToken) {
  return axios.create({
    baseURL: EBAY_BASE_URL,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE_ID,
    },
    timeout: 30000,
  });
}

// ---- Inventory Item API ----

async function createOrUpdateInventoryItem(accessToken, payload) {
  const client = createEbayClient(accessToken);
  const body = {
    availability: {
      shipToLocationAvailability: { quantity: payload.quantity },
    },
    condition: payload.condition || 'USED_EXCELLENT',
    description: { value: payload.description },
    product: {
      title: payload.title,
      description: payload.description,
      imageUrls: payload.imageUrls,
      aspects: payload.aspects || {},
    },
  };

  await withRetry(() =>
    client.put(`/sell/inventory/v1/inventory_item/${encodeURIComponent(payload.sku)}`, body)
  );
  logger.info('eBay inventory item upserted', { sku: payload.sku });
}

// ---- Offer API ----

async function createOffer(accessToken, payload) {
  const client = createEbayClient(accessToken);
  const body = {
    sku: payload.sku,
    marketplaceId: MARKETPLACE_ID,
    format: 'FIXED_PRICE',
    availableQuantity: payload.quantity,
    categoryId: payload.categoryId || '177',
    pricingSummary: {
      price: { value: payload.price.toFixed(2), currency: payload.currency || 'USD' },
    },
    listingDescription: payload.description,
    merchantLocationKey: MERCHANT_LOCATION_KEY,
  };

  const response = await withRetry(() => client.post('/sell/inventory/v1/offer', body));
  logger.info('eBay offer created', { sku: payload.sku, offerId: response.data.offerId });
  return response.data.offerId;
}

async function publishOffer(accessToken, offerId) {
  const client = createEbayClient(accessToken);
  const response = await withRetry(() =>
    client.post(`/sell/inventory/v1/offer/${offerId}/publish`)
  );
  const listingId = response.data.listingId;
  const env = EBAY_SANDBOX ? 'sandbox.ebay.com' : 'ebay.com';
  return {
    offerId,
    listingId,
    itemId: listingId,
    status: 'active',
    url: `https://www.${env}/itm/${listingId}`,
  };
}

async function getOffer(accessToken, offerId) {
  const client = createEbayClient(accessToken);
  const response = await withRetry(() =>
    client.get(`/sell/inventory/v1/offer/${offerId}`)
  );
  return response.data;
}

async function updateOffer(accessToken, offerId, updates) {
  const client = createEbayClient(accessToken);
  const response = await withRetry(() =>
    client.put(`/sell/inventory/v1/offer/${offerId}`, updates)
  );
  return response.data;
}

async function endOffer(accessToken, offerId) {
  const client = createEbayClient(accessToken);
  await withRetry(() => client.delete(`/sell/inventory/v1/offer/${offerId}`));
  logger.info('eBay offer ended', { offerId });
}

// ---- Merchant Location API ----

// In-memory flag — no need to re-check on every listing within the same process
let _locationEnsured = false;

async function ensureMerchantLocation(accessToken) {
  if (_locationEnsured) return;

  const client = createEbayClient(accessToken);

  try {
    await client.get(`/sell/inventory/v1/location/${MERCHANT_LOCATION_KEY}`);
    _locationEnsured = true;
    logger.info('eBay merchant location already exists', { key: MERCHANT_LOCATION_KEY });
    return;
  } catch (err) {
    if (err.response?.status !== 404) throw parseEbayError(err);
  }

  // Location doesn't exist — create it from env vars
  const address = {
    addressLine1: process.env.WAREHOUSE_ADDRESS_LINE1 || '1 Warehouse Way',
    city: process.env.WAREHOUSE_CITY || 'New York',
    stateOrProvince: process.env.WAREHOUSE_STATE || 'NY',
    postalCode: process.env.WAREHOUSE_ZIP || '10001',
    country: process.env.WAREHOUSE_COUNTRY || 'US',
  };

  await withRetry(() =>
    client.post(`/sell/inventory/v1/location/${MERCHANT_LOCATION_KEY}`, {
      location: { address },
      locationTypes: ['WAREHOUSE'],
      name: process.env.WAREHOUSE_NAME || 'Main Warehouse',
      merchantLocationStatus: 'ENABLED',
    })
  );

  _locationEnsured = true;
  logger.info('eBay merchant location created', { key: MERCHANT_LOCATION_KEY, address });
}

// ---- Fulfillment API (for sold status) ----

async function getOrders(accessToken, { limit = 50, offset = 0 } = {}) {
  const client = createEbayClient(accessToken);
  const response = await withRetry(() =>
    client.get('/sell/fulfillment/v1/order', { params: { limit, offset } })
  );
  return response.data;
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  ensureMerchantLocation,
  createOrUpdateInventoryItem,
  createOffer,
  publishOffer,
  getOffer,
  updateOffer,
  endOffer,
  getOrders,
  withRetry,
  parseEbayError,
};
