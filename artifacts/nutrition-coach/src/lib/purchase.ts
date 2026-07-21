import { useCreateYookassaPayment } from "@workspace/api-client-react";

export const PACK_SIZE = 21;
export const PACK_PRICE = 399;

export const AGREEMENT_TEXT =
  "Пользователь понимает и соглашается с тем, что результаты анализа, рекомендации, расчёты калорий, БЖУ и другие данные формируются автоматически и могут содержать неточности. Сервис предоставляет информацию исключительно в ознакомительных целях и не является медицинской консультацией. Решения о питании, тренировках и состоянии здоровья пользователь принимает самостоятельно.\n\nПользователь обязуется загружать только фотографии еды. Запрещается загружать незаконный, насильственный, интимный, оскорбительный или иной недопустимый контент. Сервис может отказать в обработке изображения без объяснения причин.";

interface PurchaseOptions {
  onError?: (msg: string) => void;
}

/**
 * Единая точка входа для покупки пакета анализов через YooKassa.
 * После создания платежа выполняет редирект на страницу оплаты YooKassa.
 * При подключении другого провайдера — менять логику только здесь.
 */
export function usePurchaseAnalysisPack() {
  const createPaymentMutation = useCreateYookassaPayment();

  const purchase = (options?: PurchaseOptions) => {
    createPaymentMutation.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.confirmationUrl;
      },
      onError: () => {
        options?.onError?.("Не удалось создать платёж. Попробуйте снова.");
      },
    });
  };

  return { purchase, isPending: createPaymentMutation.isPending };
}
