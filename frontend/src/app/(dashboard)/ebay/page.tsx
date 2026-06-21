'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ShoppingBag, ExternalLink, RefreshCw, Link2, Link2Off,
  Plus, RotateCcw, Zap, CheckCircle2, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ebayApi, productsApi, getErrorMessage } from '@/lib/api';
import { Product } from '@/types';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ExportButton } from '@/components/ui/ExportButton';

interface EbayListing {
  _id: string;
  itemId: { _id: string; name: string; sku: string; images: { s3Url: string }[] } | null;
  ebayListingId: string;
  status: 'draft' | 'active' | 'ended' | 'sold';
  price: number;
  quantity: number;
  quantitySold: number;
  condition?: string;
  listingUrl?: string;
  lastError?: string;
  createdAt: string;
}

const CONDITIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'USED_EXCELLENT', label: 'Used — Excellent' },
  { value: 'USED_GOOD', label: 'Used — Good' },
  { value: 'USED_ACCEPTABLE', label: 'Used — Acceptable' },
  { value: 'FOR_PARTS', label: 'For Parts' },
];

const STATUS_COLOUR: Record<string, 'green' | 'yellow' | 'gray' | 'blue'> = {
  active: 'green', draft: 'yellow', ended: 'gray', sold: 'blue',
};

function ConditionSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Condition</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    </div>
  );
}

function CreateListingModal({ product, onClose, onSuccess }: { product: Product; onClose: () => void; onSuccess: () => void }) {
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [condition, setCondition] = useState('USED_EXCELLENT');
  const [categoryId, setCategoryId] = useState('');
  const [autoRelist, setAutoRelist] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ebayApi.listItem(product._id, {
        price: parseFloat(price), quantity: parseInt(qty, 10), condition,
        categoryId: categoryId || undefined,
        autoRelistAfterDays: autoRelist ? parseInt(autoRelist, 10) : undefined,
      });
      toast.success(`"${product.name}" listed on eBay`);
      onSuccess(); onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">List on eBay</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          {product.name} <span className="font-mono text-xs">{product.sku}</span>
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (USD)" type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <Input label="Quantity" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
          </div>
          <ConditionSelect value={condition} onChange={setCondition} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Category ID" placeholder="177 (default)" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            <Input label="Auto-relist (days)" type="number" min="1" max="365" placeholder="e.g. 30" value={autoRelist} onChange={(e) => setAutoRelist(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={loading} leftIcon={<ShoppingBag className="h-4 w-4" />}>Create Listing</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkListModal({ eligible, onClose, onSuccess }: { eligible: Product[]; onClose: () => void; onSuccess: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('USED_EXCELLENT');
  const [autoRelist, setAutoRelist] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ success: unknown[]; failed: { productId: string; error: string }[] } | null>(null);

  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected.size) return;
    setLoading(true);
    try {
      const res = await ebayApi.bulkList({ itemIds: Array.from(selected), price: parseFloat(price), condition, autoRelistAfterDays: autoRelist ? parseInt(autoRelist, 10) : undefined });
      setResults(res); onSuccess();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Bulk List on eBay</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Apply the same price and condition to multiple products.</p>

        {results ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircle2 className="h-4 w-4" /><span className="text-sm font-medium">{results.success.length} listed successfully</span></div>
            {results.failed.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400"><XCircle className="h-4 w-4" /><span className="text-sm font-medium">{results.failed.length} failed</span></div>
                {results.failed.map((f) => <p key={f.productId} className="text-xs text-slate-500 dark:text-slate-400 ml-6">{f.productId}: {f.error}</p>)}
              </div>
            )}
            <Button onClick={onClose} className="w-full mt-2">Close</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              {eligible.map((p) => (
                <label key={p._id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                  <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggle(p._id)} className="rounded" />
                  <div className="min-w-0"><p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{p.sku}</p></div>
                </label>
              ))}
              {eligible.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No eligible products</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Price (USD)" type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
              <Input label="Auto-relist (days)" type="number" min="1" max="365" value={autoRelist} onChange={(e) => setAutoRelist(e.target.value)} />
            </div>
            <ConditionSelect value={condition} onChange={setCondition} />
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1" isLoading={loading} disabled={!selected.size || !price} leftIcon={<Zap className="h-4 w-4" />}>
                List {selected.size > 0 ? `${selected.size} ` : ''}Items
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function EbayPage() {
  const qc = useQueryClient();
  const [listProduct, setListProduct] = useState<Product | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: statusData } = useQuery({ queryKey: ['ebay-status'], queryFn: ebayApi.getStatus, refetchInterval: 60_000 });
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['ebay-listings', statusFilter],
    queryFn: () => ebayApi.getListings(statusFilter ? { status: statusFilter } : undefined),
  });
  const { data: eligibleData } = useQuery({
    queryKey: ['products', { status: 'verified' }],
    queryFn: () => productsApi.list({ status: 'verified', limit: 100 }),
    select: (d) => ({ ...d, products: (d.products as Product[]).filter((p) => !p.ebaySynced) }),
  });

  const syncMutation = useMutation({
    mutationFn: ebayApi.triggerSync,
    onSuccess: () => { toast.success('Sync triggered'); setTimeout(() => qc.invalidateQueries({ queryKey: ['ebay-listings'] }), 5000); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
  const relistMutation = useMutation({
    mutationFn: (id: string) => ebayApi.relistListing(id),
    onSuccess: () => { toast.success('Relisted'); qc.invalidateQueries({ queryKey: ['ebay-listings'] }); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const ebayConnected = statusData?.connected && !statusData?.isExpired;
  const listings: EbayListing[] = listingsData?.listings || [];
  const eligible: Product[] = eligibleData?.products || [];

  const exportRows = listings.map((l) => ({
    'Product': l.itemId?.name || '—',
    'SKU': l.itemId?.sku || '—',
    'Listing ID': l.ebayListingId,
    'Status': l.status,
    'Price': l.price,
    'Qty': l.quantity,
    'Sold': l.quantitySold,
    'Condition': l.condition || '—',
    'Listed': format(new Date(l.createdAt), 'yyyy-MM-dd'),
  }));

  return (
    <>
      <Header
        title="eBay Listings"
        subtitle="Sync verified inventory to eBay marketplace"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {listings.length > 0 && (
              <ExportButton rows={exportRows} columns={Object.keys(exportRows[0] || {}).map((k) => ({ header: k, key: k }))} baseName="ebay-listings" title="eBay Listings Report" />
            )}
            {ebayConnected && (
              <>
                <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} isLoading={syncMutation.isPending} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>Sync</Button>
                {eligible.length > 0 && <Button size="sm" variant="outline" onClick={() => setShowBulk(true)} leftIcon={<Zap className="h-3.5 w-3.5" />}>Bulk List</Button>}
              </>
            )}
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-5">
        {/* Connection card */}
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${ebayConnected ? 'bg-green-100 dark:bg-green-900/40' : 'bg-slate-100 dark:bg-slate-700'}`}>
                {ebayConnected ? <Link2 className="h-5 w-5 text-green-600 dark:text-green-400" /> : <Link2Off className="h-5 w-5 text-slate-400 dark:text-slate-500" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{ebayConnected ? 'Connected to eBay' : 'Not Connected'}</p>
                {statusData?.expiresAt && ebayConnected && <p className="text-xs text-slate-500 dark:text-slate-400">Expires {format(new Date(statusData.expiresAt), 'MMM d, yyyy')}</p>}
                {statusData?.isExpired && <p className="text-xs text-red-600 dark:text-red-400">Token expired — reconnect required</p>}
              </div>
            </div>
            <Button variant={ebayConnected ? 'outline' : 'primary'} size="sm" onClick={async () => { const d = await ebayApi.getAuthUrl(); window.location.href = d.authUrl; }} leftIcon={<ShoppingBag className="h-4 w-4" />}>
              {ebayConnected ? 'Reconnect' : 'Connect eBay'}
            </Button>
          </div>
        </Card>

        {!ebayConnected && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
            <strong>Setup required:</strong> Connect your eBay seller account. Set <code className="text-xs bg-amber-100 dark:bg-amber-800/50 px-1 rounded">EBAY_APP_ID</code>, <code className="text-xs bg-amber-100 dark:bg-amber-800/50 px-1 rounded">EBAY_CERT_ID</code>, and <code className="text-xs bg-amber-100 dark:bg-amber-800/50 px-1 rounded">EBAY_REDIRECT_URI</code> in your Render environment.
          </div>
        )}

        {/* Ready to list */}
        {ebayConnected && eligible.length > 0 && (
          <Card>
            <CardHeader title="Ready to List" subtitle={`${eligible.length} verified product${eligible.length !== 1 ? 's' : ''} not yet on eBay`} />
            <div className="space-y-1.5">
              {eligible.slice(0, 6).map((p) => (
                <div key={p._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.sku} · {p.images.length} img{p.images.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setListProduct(p)} leftIcon={<Plus className="h-3.5 w-3.5" />}>List</Button>
                </div>
              ))}
              {eligible.length > 6 && <p className="text-xs text-slate-400 dark:text-slate-500 text-center pt-1">+{eligible.length - 6} more — use Bulk List to list all at once</p>}
            </div>
          </Card>
        )}

        {/* Listing library */}
        <Card>
          <CardHeader
            title="Listing Library"
            subtitle={`${listingsData?.pagination?.total ?? 0} total`}
            action={
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['', 'active', 'ended', 'sold'] as const).map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                    {s || 'All'}
                  </button>
                ))}
              </div>
            }
          />

          {listingsLoading ? <PageLoader /> : listings.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">{statusFilter ? `No ${statusFilter} listings` : 'No listings yet'}</p>
          ) : (
            <div className="overflow-x-auto -mx-5 -mb-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    {['Product', 'Status', 'Price', 'Sold', 'Listed', ''].map((h) => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ${h === 'Price' || h === 'Sold' ? 'text-right' : 'text-left'} ${h === 'Sold' ? 'hidden sm:table-cell' : ''} ${h === 'Listed' ? 'hidden md:table-cell' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {listings.map((l) => (
                    <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-white truncate max-w-[160px]">{l.itemId?.name || '—'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{l.itemId?.sku || l.ebayListingId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_COLOUR[l.status]} size="sm">{l.status}</Badge>
                        {l.lastError && <p className="text-xs text-red-500 mt-0.5 max-w-[120px] truncate">{l.lastError}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">${l.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 hidden sm:table-cell">{l.quantitySold}/{l.quantity}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">{format(new Date(l.createdAt), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {l.listingUrl && <a href={l.listingUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400" title="View on eBay"><ExternalLink className="h-3.5 w-3.5" /></a>}
                          {l.itemId && <Link href={`/inventory/${l.itemId._id}`} className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400" title="View product"><ShoppingBag className="h-3.5 w-3.5" /></Link>}
                          {['ended', 'sold'].includes(l.status) && ebayConnected && (
                            <button onClick={() => relistMutation.mutate(l._id)} disabled={relistMutation.isPending} className="p-1.5 text-slate-400 hover:text-green-600 dark:hover:text-green-400" title="Relist"><RotateCcw className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {listProduct && <CreateListingModal product={listProduct} onClose={() => setListProduct(null)} onSuccess={() => { qc.invalidateQueries({ queryKey: ['ebay-listings'] }); qc.invalidateQueries({ queryKey: ['products'] }); }} />}
      {showBulk && <BulkListModal eligible={eligible} onClose={() => setShowBulk(false)} onSuccess={() => { qc.invalidateQueries({ queryKey: ['ebay-listings'] }); qc.invalidateQueries({ queryKey: ['products'] }); }} />}
    </>
  );
}
