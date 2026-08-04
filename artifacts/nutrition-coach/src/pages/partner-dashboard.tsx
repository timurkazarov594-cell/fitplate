import { useState } from "react";
import { useGetPartnerStats, getGetPartnerStatsQueryKey } from "@workspace/api-client-react";
import { getPartnerToken, clearPartnerToken } from "@/lib/partnerAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function PartnerDashboard() {
  const { toast } = useToast();
  const [token, setToken] = useState(getPartnerToken);

  const { data, isLoading, isError } = useGetPartnerStats({
    query: {
      enabled: !!token,
      queryKey: getGetPartnerStatsQueryKey(),
      refetchInterval: 15_000,
      refetchOnWindowFocus: true,
    },
    request: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });

  if (!token) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-5 text-center">
        <p className="text-muted-foreground max-w-sm">
          Нет доступа. Откройте вашу персональную ссылку вида /partner/КОД.
        </p>
      </div>
    );
  }

  const referralLink = data ? `${window.location.origin}/?ref=${data.code}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Ссылка скопирована" });
  };

  const handleLogout = () => {
    clearPartnerToken();
    setToken(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-10">
      <div className="max-w-md mx-auto px-5">
        <div className="flex items-center justify-between mt-10 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">
              {isLoading ? "Кабинет партнёра" : data?.name}
            </h1>
            <p className="text-muted-foreground">Кабинет партнёра</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Выйти
          </Button>
        </div>

        {isError && (
          <p className="text-destructive text-sm mb-6">
            Не удалось загрузить статистику. Попробуйте войти снова.
          </p>
        )}

        {isLoading && <p className="text-muted-foreground">Загрузка...</p>}

        {data && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ваша реферальная ссылка</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-muted px-3 py-2 text-sm break-all">{referralLink}</div>
                <Button className="w-full rounded-xl" onClick={copyLink}>
                  Скопировать ссылку
                </Button>
                <p className="text-sm text-muted-foreground">Код: {data.code}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2 px-3">
                  <CardTitle className="text-xs text-muted-foreground">Переходов</CardTitle>
                </CardHeader>
                <CardContent className="px-3">
                  <p className="text-2xl font-bold">{data.clicksCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 px-3">
                  <CardTitle className="text-xs text-muted-foreground">Регистраций</CardTitle>
                </CardHeader>
                <CardContent className="px-3">
                  <p className="text-2xl font-bold">{data.registrationsCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 px-3">
                  <CardTitle className="text-xs text-muted-foreground">Оплат</CardTitle>
                </CardHeader>
                <CardContent className="px-3">
                  <p className="text-2xl font-bold">{data.paymentsCount}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Сумма оплат</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.paymentsSumRub} ₽</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
