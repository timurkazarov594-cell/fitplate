import { usePurchasePack } from "@workspace/api-client-react";
import { useAuth } from "@/lib/authContext";

export const PACK_SIZE = 21;
export const PACK_PRICE = 499;

export const AGREEMENT_TEXT =
  "Пользователь понимает и соглашается с тем, что результаты анализа, рекомендации, расчёты калорий, БЖУ и другие данные формируются автоматически и могут содержать неточности. Сервис предоставляет информацию исключительно в ознакомительных целях и не является медицинской консультацией. Решения о питании, тренировках и состоянии здоровья пользователь принимает самостоятельно.\n\nПользователь обязуется загружать только фотографии еды. Запрещается загружать незаконный, насильственный, интимный, оскорбительный или иной недопустимый контент. Сервис может отказать в обработке изображения без объяснения причин.";

interface PurchaseOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

/**
 * Единая точка входа для покупки пакета анализов.
 * При подключении ЮKassa — менять логику только здесь.
 */
export function usePurchaseAnalysisPack() {
  const purchaseMutation = usePurchasePack();
  const { updateUser } = useAuth();

  const purchase = (options?: PurchaseOptions) => {
    purchaseMutation.mutate(undefined, {
      onSuccess: (updatedUser) => {
        updateUser(updatedUser);
        options?.onSuccess?.();
      },
      onError: () => {
        options?.onError?.();
      },
    });
  };

  return { purchase, isPending: purchaseMutation.isPending };
}
