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
    id: "branch-bantayan",
    name: "Bantayan District Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "R. Dela Cruz",
  },
  {
    id: "branch-daanbantayan",
    name: "Daanbantayan District Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "M. Villanueva",
  },
  {
    id: "branch-bogo",
    name: "Bogo Cebu Provincial Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "J. Cabrera",
  },
  {
    id: "branch-tuburan",
    name: "Tuburan District Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "A. Lim",
  },
  {
    id: "branch-balamban",
    name: "Balamban Cebu Provincial Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "K. Mendoza",
  },
  {
    id: "branch-sogod",
    name: "Sogod Juan B. Dosado Memorial Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "L. Ramos",
  },
  {
    id: "branch-pinamungajan",
    name: "Pinamungajan Jose Ma. V. Borromeo Memorial Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "N. Flores",
  },
  {
    id: "branch-san-francisco",
    name: "San Francisco Ricardo L. Maningo Memorial Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "C. Bautista",
  },
  {
    id: "branch-barili",
    name: "Barili District Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "P. Navarro",
  },
  {
    id: "branch-danao",
    name: "Danao Cebu Provincial Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "S. Alonzo",
  },
  {
    id: "branch-minglanilla",
    name: "Minglanilla District Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "T. Espinosa",
  },
  {
    id: "branch-carcar",
    name: "Carcar Cebu Provincial Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "G. Salvador",
  },
  {
    id: "branch-badian",
    name: "Badian District Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "D. Pineda",
  },
  {
    id: "branch-argao",
    name: "Argao Isidro C. Kintanar Memorial Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "F. Soriano",
  },
  {
    id: "branch-oslob",
    name: "Oslob District Hospital Pharmacy Branch",
    city: "Cebu",
    manager: "H. Mercado",
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

const inventoryProfiles: Array<Array<Omit<StoreInventoryItem, "storeId">>> = [
  [
    {productId: "prd-rice", onHand: 21},
    {productId: "prd-flour", onHand: 14},
    {productId: "prd-tomato", onHand: 19},
    {productId: "prd-salmon", onHand: 11},
    {productId: "prd-wrap", onHand: 43},
    {productId: "prd-label", onHand: 24},
  ],
  [
    {productId: "prd-rice", onHand: 48},
    {productId: "prd-flour", onHand: 22},
    {productId: "prd-tomato", onHand: 12},
    {productId: "prd-salmon", onHand: 18},
    {productId: "prd-wrap", onHand: 39},
    {productId: "prd-label", onHand: 19},
  ],
  [
    {productId: "prd-rice", onHand: 28},
    {productId: "prd-flour", onHand: 11},
    {productId: "prd-tomato", onHand: 16},
    {productId: "prd-salmon", onHand: 13},
    {productId: "prd-wrap", onHand: 37},
    {productId: "prd-label", onHand: 26},
  ],
];

export const storeInventory: StoreInventoryItem[] = stores.flatMap((store, index) => {
  const profile = inventoryProfiles[index % inventoryProfiles.length];
  return profile.map(item => ({
    storeId: store.id,
    ...item,
  }));
});

export const reorderRequests: ReorderRequest[] = [
  {
    id: "req-1008",
    storeId: "branch-bantayan",
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
    storeId: "branch-daanbantayan",
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
    storeId: "branch-bantayan",
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
    storeId: "branch-daanbantayan",
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
