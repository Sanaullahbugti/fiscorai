export type TransactionRow = {
  transaction_type?: string;
  exp_country?: string;
  vat_percentage?: string | number;
  total: number;
  base: number;
  vat: number;
  currency: string;
};

export type Category = {
  category: string;
  transactions: {
    ALL?: TransactionRow[];
    VAT?: TransactionRow[];
    TRANSACTION?: TransactionRow[];
  };
};

export type Country = {
  country: string;
  transactionCategories: Category[];
};

export type GeneralResponse<T> = {
  message: string;
  statusCode: number;
  data?: T;
};

export type AuthUser = {
  userId: string;
  username: string;
  email?: string;
  jwtToken: string;
  refreshToken?: string;
  userSubscription?: { plan: string; price: number; active: boolean; expiresAt?: string | null };
};

export type PeriodPayload = {
  fileType: "monthly" | "quarterly";
  year: number;
  month?: string;
  quarter?: string;
  fileExtension?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  contact?: string | null;
  alias?: string | null;
  amazonId?: string | null;
  plan: string;
  userStripeId?: string | null;
  businessUser?: boolean;
};

export type PaymentRecord = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  plan?: string | null;
  stripeSessionId?: string | null;
  invoiceId?: string | null;
  invoiceHostedURL?: string | null;
  createdAt: string;
};

export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
};

export type SubscriptionInfo = {
  plan: string;
  price: number;
  active: boolean;
  expiresAt?: string | null;
};
