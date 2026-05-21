import type {
  CustomerProfile,
  CustomerOrder,
  InventoryTransaction,
  Product,
  ReorderRequest,
  Role,
  ShippingOrder,
  Store,
  StoreInventoryItem,
} from "../types/domain";

export const roles: Role[] = ["store", "warehouse", "stakeholder"];

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
    id: "req-1004",
    storeId: "branch-bogo",
    createdAt: "2026-05-15",
    priority: "Medium",
    status: "Fulfilled",
    items: [
      {productId: "prd-wrap", requestedQty: 80},
      {productId: "prd-label", requestedQty: 42},
    ],
  },
  {
    id: "req-1006",
    storeId: "branch-tuburan",
    createdAt: "2026-05-17",
    priority: "High",
    status: "Approved",
    items: [
      {productId: "prd-rice", requestedQty: 30},
      {productId: "prd-tomato", requestedQty: 40},
    ],
  },
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
  {
    id: "req-1012",
    storeId: "branch-oslob",
    createdAt: "2026-05-21",
    priority: "High",
    status: "Pending",
    items: [
      {productId: "prd-flour", requestedQty: 26},
      {productId: "prd-salmon", requestedQty: 18},
    ],
  },
];

export const shippingOrders: ShippingOrder[] = [
  {
    id: "ship-768",
    requestId: "req-1004",
    storeId: "branch-bogo",
    shipDate: "2026-05-16",
    eta: "2026-05-18",
    status: "Delivered",
    items: [
      {productId: "prd-wrap", quantity: 80},
      {productId: "prd-label", quantity: 42},
    ],
    carrier: "Cebu Health Logistics",
    trackingCode: "CEB-TRK-768",
    currentLocation: "Bogo Cebu Provincial Hospital",
    statusHistory: [
      {
        status: "Draft",
        occurredAt: "2026-05-16T08:00:00.000Z",
        location: "Cebu Distribution Center",
        note: "Dispatch created from refill request",
      },
      {
        status: "Packed",
        occurredAt: "2026-05-16T10:15:00.000Z",
        location: "Cebu Distribution Center",
        note: "Shipment packed and staged",
      },
      {
        status: "In Transit",
        occurredAt: "2026-05-17T01:05:00.000Z",
        location: "North Cebu Transit Route",
        note: "Outbound van departed",
      },
      {
        status: "Delivered",
        occurredAt: "2026-05-18T03:25:00.000Z",
        location: "Bogo Cebu Provincial Hospital",
        note: "Received by branch team",
      },
    ],
  },
  {
    id: "ship-770",
    requestId: "req-1008",
    storeId: "branch-bantayan",
    shipDate: "2026-05-20",
    eta: "2026-05-22",
    status: "In Transit",
    items: [
      {productId: "prd-rice", quantity: 40},
      {productId: "prd-flour", quantity: 32},
      {productId: "prd-salmon", quantity: 24},
    ],
    carrier: "Cebu Health Logistics",
    trackingCode: "CEB-TRK-770",
    currentLocation: "Santa Fe Ferry Crossing",
    statusHistory: [
      {
        status: "Draft",
        occurredAt: "2026-05-20T04:20:00.000Z",
        location: "Cebu Distribution Center",
        note: "Dispatch drafted",
      },
      {
        status: "Packed",
        occurredAt: "2026-05-20T07:40:00.000Z",
        location: "Cebu Distribution Center",
        note: "Packed and quality checked",
      },
      {
        status: "In Transit",
        occurredAt: "2026-05-21T02:00:00.000Z",
        location: "Santa Fe Ferry Crossing",
        note: "Shipment departed distribution center",
      },
    ],
  },
  {
    id: "ship-771",
    requestId: "req-1010",
    storeId: "branch-daanbantayan",
    shipDate: "2026-05-21",
    eta: "2026-05-23",
    status: "Packed",
    items: [
      {productId: "prd-tomato", quantity: 36},
      {productId: "prd-label", quantity: 22},
    ],
    carrier: "Cebu Health Logistics",
    trackingCode: "CEB-TRK-771",
    currentLocation: "Cebu Distribution Center",
    statusHistory: [
      {
        status: "Draft",
        occurredAt: "2026-05-21T01:00:00.000Z",
        location: "Cebu Distribution Center",
        note: "Dispatch prepared",
      },
      {
        status: "Packed",
        occurredAt: "2026-05-21T06:10:00.000Z",
        location: "Cebu Distribution Center",
        note: "Awaiting truck departure",
      },
    ],
  },
  {
    id: "ship-772",
    requestId: "req-1006",
    storeId: "branch-tuburan",
    shipDate: "2026-05-21",
    eta: "2026-05-24",
    status: "Draft",
    items: [
      {productId: "prd-rice", quantity: 30},
      {productId: "prd-tomato", quantity: 40},
    ],
    carrier: "Cebu Health Logistics",
    trackingCode: "CEB-TRK-772",
    currentLocation: "Cebu Distribution Center",
    statusHistory: [
      {
        status: "Draft",
        occurredAt: "2026-05-21T09:40:00.000Z",
        location: "Cebu Distribution Center",
        note: "Draft awaiting pack approval",
      },
    ],
  },
];

export const customerOrders: CustomerOrder[] = [
  {
    id: "ord-5002",
    storeId: "branch-bantayan",
    customerId: "cst-101",
    customerName: "Maria Gonzales",
    customerPhone: "+63 917 123 0011",
    customerEmail: "maria.gonzales@example.com",
    customerAddress: "Poblacion, Bantayan, Cebu",
    customerNotes: "Asthmatic; prefers evening pickup.",
    orderRef: "RX-23119",
    servedAt: "2026-05-19T08:18:00.000Z",
    items: [
      {productId: "prd-rice", quantity: 12},
      {productId: "prd-flour", quantity: 8},
    ],
  },
  {
    id: "ord-5003",
    storeId: "branch-daanbantayan",
    customerId: "cst-102",
    customerName: "Danilo Perez",
    customerPhone: "+63 917 123 0022",
    customerEmail: "danilo.perez@example.com",
    customerAddress: "Maya, Daanbantayan, Cebu",
    customerNotes: "Follow-up refill every 30 days.",
    orderRef: "RX-23122",
    servedAt: "2026-05-20T10:45:00.000Z",
    items: [
      {productId: "prd-tomato", quantity: 11},
      {productId: "prd-label", quantity: 6},
    ],
  },
  {
    id: "ord-5004",
    storeId: "branch-bogo",
    customerId: "cst-103",
    customerName: "Elena Bautista",
    customerPhone: "+63 917 123 0033",
    customerEmail: "elena.bautista@example.com",
    customerAddress: "Cogon, Bogo City, Cebu",
    customerNotes: "Senior priority lane.",
    orderRef: "RX-23125",
    servedAt: "2026-05-20T13:10:00.000Z",
    items: [
      {productId: "prd-rice", quantity: 9},
      {productId: "prd-wrap", quantity: 18},
    ],
  },
  {
    id: "ord-5005",
    storeId: "branch-tuburan",
    customerId: "cst-104",
    customerName: "Rico Navarro",
    customerPhone: "+63 917 123 0044",
    customerEmail: "rico.navarro@example.com",
    customerAddress: "Tuburan Proper, Cebu",
    customerNotes: "Cold-chain pickup within 30 minutes.",
    orderRef: "RX-23131",
    servedAt: "2026-05-21T01:20:00.000Z",
    items: [
      {productId: "prd-tomato", quantity: 10},
      {productId: "prd-salmon", quantity: 4},
    ],
  },
];

export const customerProfiles: CustomerProfile[] = [
  {
    id: "cst-101",
    fullName: "Maria Gonzales",
    phone: "+63 917 123 0011",
    email: "maria.gonzales@example.com",
    address: "Poblacion, Bantayan, Cebu",
    notes: "Asthmatic; prefers evening pickup.",
    preferredStoreId: "branch-bantayan",
    lastOrderRef: "RX-23119",
    lastServedAt: "2026-05-19T08:18:00.000Z",
  },
  {
    id: "cst-102",
    fullName: "Danilo Perez",
    phone: "+63 917 123 0022",
    email: "danilo.perez@example.com",
    address: "Maya, Daanbantayan, Cebu",
    notes: "Follow-up refill every 30 days.",
    preferredStoreId: "branch-daanbantayan",
    lastOrderRef: "RX-23122",
    lastServedAt: "2026-05-20T10:45:00.000Z",
  },
  {
    id: "cst-103",
    fullName: "Elena Bautista",
    phone: "+63 917 123 0033",
    email: "elena.bautista@example.com",
    address: "Cogon, Bogo City, Cebu",
    notes: "Senior priority lane.",
    preferredStoreId: "branch-bogo",
    lastOrderRef: "RX-23125",
    lastServedAt: "2026-05-20T13:10:00.000Z",
  },
  {
    id: "cst-104",
    fullName: "Rico Navarro",
    phone: "+63 917 123 0044",
    email: "rico.navarro@example.com",
    address: "Tuburan Proper, Cebu",
    notes: "Cold-chain pickup within 30 minutes.",
    preferredStoreId: "branch-tuburan",
    lastOrderRef: "RX-23131",
    lastServedAt: "2026-05-21T01:20:00.000Z",
  },
];

export const inventoryTransactions: InventoryTransaction[] = [
  {
    id: "txn-1",
    storeId: "branch-bogo",
    productId: "prd-wrap",
    movementType: "IN",
    quantity: 80,
    occurredAt: "2026-05-18T03:25:00.000Z",
    reference: "ship-768",
    note: "Shipment received",
  },
  {
    id: "txn-2",
    storeId: "branch-bogo",
    productId: "prd-label",
    movementType: "IN",
    quantity: 42,
    occurredAt: "2026-05-18T03:25:00.000Z",
    reference: "ship-768",
    note: "Shipment received",
  },
  {
    id: "txn-3",
    storeId: "branch-bantayan",
    productId: "prd-rice",
    movementType: "OUT",
    quantity: 12,
    occurredAt: "2026-05-19T08:18:00.000Z",
    reference: "ord-5002",
    note: "Customer order RX-23119",
  },
  {
    id: "txn-4",
    storeId: "branch-bantayan",
    productId: "prd-flour",
    movementType: "OUT",
    quantity: 8,
    occurredAt: "2026-05-19T08:18:00.000Z",
    reference: "ord-5002",
    note: "Customer order RX-23119",
  },
  {
    id: "txn-5",
    storeId: "branch-daanbantayan",
    productId: "prd-tomato",
    movementType: "OUT",
    quantity: 11,
    occurredAt: "2026-05-20T10:45:00.000Z",
    reference: "ord-5003",
    note: "Customer order RX-23122",
  },
  {
    id: "txn-6",
    storeId: "branch-daanbantayan",
    productId: "prd-label",
    movementType: "OUT",
    quantity: 6,
    occurredAt: "2026-05-20T10:45:00.000Z",
    reference: "ord-5003",
    note: "Customer order RX-23122",
  },
  {
    id: "txn-7",
    storeId: "branch-bogo",
    productId: "prd-wrap",
    movementType: "OUT",
    quantity: 18,
    occurredAt: "2026-05-20T13:10:00.000Z",
    reference: "ord-5004",
    note: "Customer order RX-23125",
  },
  {
    id: "txn-8",
    storeId: "branch-tuburan",
    productId: "prd-salmon",
    movementType: "OUT",
    quantity: 4,
    occurredAt: "2026-05-21T01:20:00.000Z",
    reference: "ord-5005",
    note: "Customer order RX-23131",
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
