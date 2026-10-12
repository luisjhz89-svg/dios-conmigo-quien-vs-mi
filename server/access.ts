export type SubscriptionStatus = "active" | "trialing" | "canceled" | "past_due" | null;

export function hasAccess(
  trialEndsAt: Date | string,
  subscriptionStatus: SubscriptionStatus,
  now = new Date(),
) {
  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") return true;
  return new Date(trialEndsAt).getTime() > now.getTime();
}
