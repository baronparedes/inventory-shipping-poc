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
  {
    id: "store-north",
    name: "NorthCare Pharmacy",
    city: "Manila",
    manager: "T. Rivera",
  },
  {
    id: "store-east",
    name: "EastCare Pharmacy",
    city: "Cebu City",
    manager: "L. Brooks",
  },
  {
    id: "store-west",
    name: "WestCare Pharmacy",
    city: "Davao City",
    manager: "C. Nguyen",
  },
];

export const products: Product[] = [
  {
    id: "prd-rice",
    sku: "RX-100",
    name: "Amoxicillin 500 mg",
    category: "Prescription",
    reorderThreshold: 60,
    warehouseStock: 950,
  },
  {
    id: "prd-flour",
    sku: "RX-112",
    name: "Lisinopril 20 mg",
    category: "Prescription",
    reorderThreshold: 55,
    warehouseStock: 840,
  },
  {
    id: "prd-tomato",
    sku: "OTC-210",
    name: "Ibuprofen 200 mg",
    category: "OTC",
    reorderThreshold: 75,
    warehouseStock: 1280,
  },
  {
    id: "prd-salmon",
    sku: "CC-301",
    name: "Insulin Pen 3 mL",
    category: "Cold Chain",
    reorderThreshold: 28,
    warehouseStock: 260,
  },
  {
    id: "prd-wrap",
    sku: "SUP-401",
    name: "Syringe 1 mL",
    category: "Supplies",
    reorderThreshold: 120,
    warehouseStock: 2450,
  },
  {
    id: "prd-label",
    sku: "SUP-422",
    name: "Prescription Label Roll",
    category: "Supplies",
    reorderThreshold: 90,
    warehouseStock: 710,
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
    id: "ship-770",
    requestId: "req-1008",
    storeId: "store-north",
    shipDate: "2026-05-20",
    eta: "2026-05-21",
    status: "In Transit",
    items: [
      {productId: "prd-rice", quantity: 40},
      {productId: "prd-flour", quantity: 32},
      {productId: "prd-salmon", quantity: 24},
    ],
  },
  {
    id: "ship-771",
    requestId: "req-1010",
    storeId: "store-east",
    shipDate: "2026-05-21",
    eta: "2026-05-22",
    status: "Packed",
    items: [
      {productId: "prd-tomato", quantity: 36},
      {productId: "prd-label", quantity: 22},
    ],
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
