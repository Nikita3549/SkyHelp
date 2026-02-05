export interface IAdminClaimsStatsResponse {
    total: number;
    paid: number;
    approved: number;
    active: number;
    completedAmount: number;
    claimsByDay: { date: string; count: number }[];
    successByMonth: { month: string; success: string }[];
    airlines: { count: number; name: string; icao: string }[];
    claimsViaBoardingPass: number;
}
