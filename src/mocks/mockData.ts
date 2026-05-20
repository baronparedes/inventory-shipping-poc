import type {
  Product,
  ReorderRequest,
  Role,
  ShippingOrder,
  Store,
  StoreInventoryItem,
} from "../types/domain";

export const roles: Role[] = ["store", "warehouse"];

export const stores: Store[] = [
  {id: "store-north", name: "North Market", city: "Austin", manager: "T. Rivera"},
  {id: "store-east", name: "East Corner", city: "Dallas", manager: "L. Brooks"},
  {id: "store-west", name: "West Harbor", city: "Houston", manager: "C. Nguyen"},
];

export const products: Product[] = [
  {
    id: "prd-rice",
    sku: "DRY-100",
    name: "Rice 25 lb",
    category: "Dry Goods",
    reorderThreshold: 25,
    warehouseStock: 420,
  },
  {
    id: "prd-flour",
    sku: "DRY-110",
    name: "Bread Flour 20 lb",
    category: "Dry Goods",
    reorderThreshold: 20,
    warehouseStock: 275,
  },
  {
    id: "prd-tomato",
    sku: "PRD-210",
    name: "Tomato Crate",
    category: "Produce",
    reorderThreshold: 18,
    warehouseStock: 94,
  },
  {
    id: "prd-salmon",
    sku: "FRZ-301",
    name: "Frozen Salmon Box",
    category: "Frozen",
    reorderThreshold: 16,
    warehouseStock: 66,
  },
  {
    id: "prd-wrap",
    sku: "PKG-401",
    name: "Shipping Wrap Rolls",
    category: "Packaging",
    reorderThreshold: 30,
    warehouseStock: 340,
  },
  {
    id: "prd-label",
    sku: "PKG-422",
    name: "Thermal Label Pack",
    category: "Packaging",
    reorderThreshold: 35,
    warehouseStock: 130,
  },
];

export const storeInventory: StoreInventoryItem[] = [
  {storeId: "store-north", productId: "prd-rice", onHand: 21, weeklyOutflow: 16},
  {storeId: "store-north", productId: "prd-flour", onHand: 14, weeklyOutflow: 12},
  {storeId: "store-north", productId: "prd-tomato", onHand: 19, weeklyOutflow: 14},
  {storeId: "store-north", productId: "prd-salmon", onHand: 11, weeklyOutflow: 9},
  {storeId: "store-north", productId: "prd-wrap", onHand: 43, weeklyOutflow: 11},
  {storeId: "store-east", productId: "prd-rice", onHand: 48, weeklyOutflow: 15},
  {storeId: "store-east", productId: "prd-flour", onHand: 22, weeklyOutflow: 10},
  {storeId: "store-east", productId: "prd-tomato", onHand: 12, weeklyOutflow: 16},
  {storeId: "store-east", productId: "prd-salmon", onHand: 18, weeklyOutflow: 8},
  {storeId: "store-east", productId: "prd-label", onHand: 19, weeklyOutflow: 13},
  {storeId: "store-west", productId: "prd-rice", onHand: 28, weeklyOutflow: 13},
  {storeId: "store-west", productId: "prd-flour", onHand: 11, weeklyOutflow: 11},
  {storeId: "store-west", productId: "prd-tomato", onHand: 16, weeklyOutflow: 15},
  {storeId: "store-west", productId: "prd-wrap", onHand: 37, weeklyOutflow: 12},
  {storeId: "store-west", productId: "prd-label", onHand: 26, weeklyOutflow: 14},
];

export const reorderRequests: ReorderRequest[] = [
  {
    id: "req-1008",
    storeId: "store-north",
    createdAt: "2026-05-18",
    priority: "High",
    status: "Pending",
    items: [
      {productId: "prd-rice", requestedQty: 40},
      {productId: "prd-flour", requestedQty: 32},
      {productId: "prd-salmon", requestedQty: 24},
    ],
  },
  {
    id: "req-1010",
    storeId: "store-east",
    createdAt: "2026-05-20",
    priority: "Medium",
    status: "Approved",
    items: [
      {productId: "prd-tomato", requestedQty: 36},
      {productId: "prd-label", requestedQty: 22},
    ],
  },
];

export const shippingOrders: ShippingOrder[] = [
  {
    id: "ship-771",
    requestId: "req-1010",
    storeId: "store-east",
    shipDate: "2026-05-21",
    eta: "2026-05-22",
    status: "Packed",
  },
];

export const getStoreById = (storeId: string) => stores.find(store => store.id === storeId);

export const getProductById = (productId: string) =>
  products.find(product => product.id === productId);

export const getStoreInventory = (storeId: string) =>
  storeInventory.filter(item => item.storeId === storeId);

export const getLowStockItems = (storeId: string) =>
  getStoreInventory(storeId).filter(item => {
    const product = getProductById(item.productId);
    return product ? item.onHand <= product.reorderThreshold : false;
  });
