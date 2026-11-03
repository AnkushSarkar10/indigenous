export interface AdminRequestSummary {
  reference: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  organisation: string | null;
  itemCount: number;
}

export interface AdminRequestList {
  requests: AdminRequestSummary[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

export interface AdminRequestDetail extends Omit<AdminRequestSummary, "itemCount"> {
  email: string;
  contactNumber: string;
  address: string | null;
  notes: string | null;
  items: { skuSnapshot: string; nameSnapshot: string; quantity: number }[];
}
