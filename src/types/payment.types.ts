// --- Stripe Types ---
export interface StripePaymentIntentSucceeded {
  id: string;
  amount: number;
  currency: string;
  customer?: string | null;
  metadata: Record<string, string>;
  status: 'succeeded';
  payment_method: string;
}

export interface CreateStripeIntentParams {
  workspaceId:  string;
  dealId?:      string;
  amount:       number;
  currency:     string;
  description?: string;
}


// --- Razorpay Types ---
export interface RazorpayWebhookPayload {
  entity: 'event';
  account_id: string;
  event: 'payment.captured' | 'payment.failed' | 'order.paid';
  contains: string[];
  payload: {
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        order_id: string;
        status: string;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        status: string;
      };
    };
  };
  created_at: number;
}

export interface CreateRazorpayOrderParams {
  workspaceId: string;
  dealId?:     string;
  amount:      number;
  currency:    string;
  receipt?:    string;
  notes?:      Record<string, string>;
}

export interface VerifyRazorpaySignatureParams {
  orderId:   string;
  paymentId: string;
  signature: string;
}

export interface StripePaymentIntentResult {
  clientSecret: string;
  paymentId:    string;
}

export interface RazorpayOrderResult {
  orderId:   string;
  amount:    number;
  currency:  string;
  paymentId?: string;
}
