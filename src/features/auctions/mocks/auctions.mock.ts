import type { Auction, Bid, AuctionPage, BidPage } from '@/contracts/api.generated';

export const mockAuctions: Auction[] = [
  {
    id: 'auc-001-active-iphone',
    productId: 'prod-001-iphone',
    sellerId: 'user-seller-001',
    productTitle: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên (VNA)',
    productThumbnail: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=60',
    startingPrice: '20000000',
    currentPrice: '23500000',
    bidIncrement: '500000',
    currency: 'VND',
    startTime: new Date(Date.now() - 3600 * 1000 * 2).toISOString(), // 2 hours ago
    endTime: new Date(Date.now() + 3600 * 1000 * 4).toISOString(), // 4 hours from now
    status: 'ACTIVE',
    version: 8,
    winnerId: null,
    finalPrice: null,
  },
  {
    id: 'auc-002-pending-macbook',
    productId: 'prod-002-macbook',
    sellerId: 'user-seller-002',
    productTitle: 'MacBook Pro 16 inch M3 Max 36GB RAM 1TB SSD',
    productThumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=60',
    startingPrice: '60000000',
    currentPrice: '60000000',
    bidIncrement: '1000000',
    currency: 'VND',
    startTime: new Date(Date.now() + 3600 * 1000 * 2).toISOString(), // 2 hours in future
    endTime: new Date(Date.now() + 3600 * 1000 * 12).toISOString(), // 12 hours in future
    status: 'PENDING',
    version: 1,
    winnerId: null,
    finalPrice: null,
  },
  {
    id: 'auc-003-ended-sony',
    productId: 'prod-003-sony',
    sellerId: 'user-seller-001',
    productTitle: 'Tai nghe Chống ồn Sony WH-1000XM5 Đen Likenew',
    productThumbnail: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=60',
    startingPrice: '4500000',
    currentPrice: '6500000',
    bidIncrement: '200000',
    currency: 'VND',
    startTime: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    endTime: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
    status: 'ENDED',
    version: 11,
    winnerId: 'user-bidder-001',
    finalPrice: '6500000',
  },
  {
    id: 'auc-004-active-rolex',
    productId: 'prod-004-rolex',
    sellerId: 'user-seller-003',
    productTitle: 'Đồng hồ Thụy Sỹ Tissot Le Locle Powermatic 80',
    productThumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60',
    startingPrice: '10000000',
    currentPrice: '12500000',
    bidIncrement: '500000',
    currency: 'VND',
    startTime: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    endTime: new Date(Date.now() + 3600 * 1000 * 1).toISOString(),
    status: 'ACTIVE',
    version: 6,
    winnerId: null,
    finalPrice: null,
  },
  {
    id: 'auc-005-cancelled',
    productId: 'prod-005-camera',
    sellerId: 'user-seller-002',
    productTitle: 'Máy ảnh Fujifilm X-T5 kèm Lens 18-55mm F2.8-4',
    productThumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=60',
    startingPrice: '35000000',
    currentPrice: '35000000',
    bidIncrement: '1000000',
    currency: 'VND',
    startTime: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    endTime: new Date(Date.now() + 3600 * 1000 * 5).toISOString(),
    status: 'CANCELLED',
    version: 2,
    winnerId: null,
    finalPrice: null,
  },
];

export const mockBidsByAuctionId: Record<string, Bid[]> = {
  'auc-001-active-iphone': [
    {
      id: 'bid-007',
      auctionId: 'auc-001-active-iphone',
      bidderId: 'user-bidder-lead',
      amount: '23500000',
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      id: 'bid-006',
      auctionId: 'auc-001-active-iphone',
      bidderId: 'user-bidder-002',
      amount: '23000000',
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: 'bid-005',
      auctionId: 'auc-001-active-iphone',
      bidderId: 'user-bidder-lead',
      amount: '22500000',
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    },
    {
      id: 'bid-004',
      auctionId: 'auc-001-active-iphone',
      bidderId: 'user-bidder-003',
      amount: '22000000',
      createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    },
    {
      id: 'bid-003',
      auctionId: 'auc-001-active-iphone',
      bidderId: 'user-bidder-002',
      amount: '21500000',
      createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    },
    {
      id: 'bid-002',
      auctionId: 'auc-001-active-iphone',
      bidderId: 'user-bidder-001',
      amount: '21000000',
      createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    },
    {
      id: 'bid-001',
      auctionId: 'auc-001-active-iphone',
      bidderId: 'user-bidder-003',
      amount: '20500000',
      createdAt: new Date(Date.now() - 1000 * 60 * 100).toISOString(),
    },
  ],
  'auc-003-ended-sony': [
    {
      id: 'bid-103',
      auctionId: 'auc-003-ended-sony',
      bidderId: 'user-bidder-001',
      amount: '6500000',
      createdAt: new Date(Date.now() - 3600 * 1000 * 2 - 1000 * 60 * 5).toISOString(),
    },
    {
      id: 'bid-102',
      auctionId: 'auc-003-ended-sony',
      bidderId: 'user-bidder-002',
      amount: '6000000',
      createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    },
    {
      id: 'bid-101',
      auctionId: 'auc-003-ended-sony',
      bidderId: 'user-bidder-001',
      amount: '5000000',
      createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    },
  ],
  'auc-004-rolex': [
    {
      id: 'bid-202',
      auctionId: 'auc-004-rolex',
      bidderId: 'user-bidder-002',
      amount: '12500000',
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: 'bid-201',
      auctionId: 'auc-004-rolex',
      bidderId: 'user-bidder-001',
      amount: '11000000',
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ],
};

export function getMockAuctionPage(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}): AuctionPage {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, params?.pageSize ?? 12));
  let filtered = [...mockAuctions];

  if (params?.status) {
    filtered = filtered.filter((a) => a.status === params.status);
  }
  if (params?.search) {
    const q = params.search.toLowerCase().trim();
    filtered = filtered.filter((a) => (a.productTitle ?? '').toLowerCase().includes(q));
  }

  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    total: filtered.length,
  };
}

export function getMockBidPage(
  auctionId: string,
  params?: { page?: number; pageSize?: number }
): BidPage {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, params?.pageSize ?? 10));
  const bids = mockBidsByAuctionId[auctionId] ?? [];
  const start = (page - 1) * pageSize;
  const items = bids.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    total: bids.length,
  };
}
