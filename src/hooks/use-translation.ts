import { useGlobalSettings } from "@/components/providers/global-settings-provider";
import { dictionaries } from "@/lib/i18n/dictionaries";

export function useTranslation() {
  const { language } = useGlobalSettings();

  const t = (key: string, params?: Record<string, any>) => {
    // Get the dictionary for the current language, default to English
    const dict = dictionaries[language] || dictionaries["en"];
    
    // Get the raw translated string
    let text = dict[key] || dictionaries["en"][key] || key;

    // Perform variable replacement if params exist
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }

    return text;
  };

  return { t, language };
}
