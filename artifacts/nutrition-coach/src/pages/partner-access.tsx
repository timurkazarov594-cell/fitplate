import { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useLoginPartner } from "@workspace/api-client-react";
import { setPartnerToken } from "@/lib/partnerAuth";

/**
 * Zero-click magic link: /partner/:code logs the partner in by code alone
 * and forwards to /partner. No login form — the code in the URL is the
 * entire credential (temporary, code-only auth per owner's request).
 */
export default function PartnerAccess() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const mutation = useLoginPartner();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !code) return;
    attempted.current = true;
    mutation.mutate(
      { data: { code } },
      {
        onSuccess: (data) => {
          setPartnerToken(data.token);
          setLocation("/partner");
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center px-5 text-center">
      {mutation.isError ? (
        <p className="text-destructive text-sm max-w-sm">
          Ссылка недействительна: партнёр с кодом «{code}» не найден.
        </p>
      ) : (
        <p className="text-muted-foreground">Открываем кабинет...</p>
      )}
    </div>
  );
}
