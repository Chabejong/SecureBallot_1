import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CreditCard, Loader2 } from "lucide-react";

class InvitedPollPayPalSDKManager {
  private static instance: InvitedPollPayPalSDKManager;
  private isLoading = false;
  private isLoaded = false;
  private sdkInstance: any = null;
  private loadPromise: Promise<void> | null = null;

  static getInstance(): InvitedPollPayPalSDKManager {
    if (!InvitedPollPayPalSDKManager.instance) {
      InvitedPollPayPalSDKManager.instance = new InvitedPollPayPalSDKManager();
    }
    return InvitedPollPayPalSDKManager.instance;
  }

  async loadSDK(): Promise<void> {
    if (this.isLoaded && (window as any).paypal && this.sdkInstance) {
      return Promise.resolve();
    }
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }
    this.isLoading = true;
    this.loadPromise = this.doLoadSDK();
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
    }
  }

  private async doLoadSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if ((window as any).paypal) {
          this.initializeSDK().then(resolve).catch(reject);
          return;
        }
        const script = document.createElement("script");
        script.src = import.meta.env.PROD
          ? "https://www.paypal.com/web-sdk/v6/core"
          : "https://www.sandbox.paypal.com/web-sdk/v6/core";
        script.async = true;
        script.onload = () => {
          this.initializeSDK().then(resolve).catch(reject);
        };
        script.onerror = () => {
          reject(new Error("Failed to load PayPal SDK"));
        };
        document.body.appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async initializeSDK(): Promise<void> {
    try {
      const clientToken: string = await fetch("/paypal/setup")
        .then((res) => res.json())
        .then((data) => data.clientToken);

      this.sdkInstance = await (window as any).paypal.createInstance({
        clientToken,
        components: ["paypal-payments"],
      });
      this.isLoaded = true;
    } catch (error) {
      console.error("Failed to initialize PayPal SDK:", error);
      throw error;
    }
  }

  getSDKInstance() {
    return this.sdkInstance;
  }

  isSDKReady(): boolean {
    return this.isLoaded && this.sdkInstance !== null;
  }
}

interface InvitedPollPayPalButtonProps {
  pollId: string;
  amount: number;
  voterCount: number;
  onSuccess?: () => void;
}

export default function InvitedPollPayPalButton({
  pollId,
  amount,
  voterCount,
  onSuccess,
}: InvitedPollPayPalButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPayPalReady, setIsPayPalReady] = useState(false);
  const { toast } = useToast();
  const sdkManager = InvitedPollPayPalSDKManager.getInstance();

  const createOrder = async () => {
    const response = await fetch("/paypal/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount.toFixed(2),
        currency: "EUR",
        intent: "capture",
      }),
    });
    const output = await response.json();
    return { orderId: output.id };
  };

  const captureOrder = async (orderId: string) => {
    const response = await fetch(`/paypal/order/${orderId}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return response.json();
  };

  const onApprove = async (data: any) => {
    setIsProcessing(true);
    try {
      await captureOrder(data.orderId);

      const recordRes = await fetch(`/api/invited-polls/${pollId}/record-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paypalOrderId: data.orderId }),
      });

      if (!recordRes.ok) {
        throw new Error("Failed to record payment");
      }

      await queryClient.invalidateQueries({
        queryKey: ["/api/invited-polls", pollId, "payment-info"],
      });

      toast({
        title: "Payment Successful",
        description: `Your payment of €${amount} for ${voterCount} voters has been confirmed. You can now send invitations.`,
      });

      onSuccess?.();
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: "Payment was processed but could not be confirmed. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onCancel = () => {
    toast({
      title: "Payment Cancelled",
      description: "You cancelled the payment. Invitations cannot be sent until payment is completed.",
    });
  };

  const onError = (error: any) => {
    console.error("PayPal error:", error);
    toast({
      title: "Payment Error",
      description: "There was an error processing your payment. Please try again.",
      variant: "destructive",
    });
  };

  const handlePayment = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      if (!sdkManager.isSDKReady()) {
        throw new Error("PayPal SDK not ready");
      }
      const sdkInstance = sdkManager.getSDKInstance();
      const paypalCheckout = sdkInstance.createPayPalOneTimePaymentSession({
        onApprove,
        onCancel,
        onError,
      });
      const checkoutOptionsPromise = createOrder();
      await paypalCheckout.start(
        { paymentFlow: "checkout" },
        checkoutOptionsPromise,
      );
    } catch (e) {
      console.error("Payment initiation error:", e);
      toast({
        title: "Error",
        description: "Failed to start payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    sdkManager.loadSDK().then(() => setIsPayPalReady(true)).catch(() => {
      toast({
        title: "PayPal Error",
        description: "Failed to load PayPal. Please refresh the page.",
        variant: "destructive",
      });
    });
  }, []);

  return (
    <Button
      onClick={handlePayment}
      disabled={!isPayPalReady || isProcessing}
      size="lg"
      className="w-full"
      data-testid="button-pay-invited-poll"
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : !isPayPalReady ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading PayPal...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          Pay €{amount} — Card or PayPal
        </>
      )}
    </Button>
  );
}
