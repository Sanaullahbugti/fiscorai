import { LanguagePicker } from "@/components/LanguagePicker";
import { useUiStore } from "@/stores/uiStore";

export function AuthLangPills() {
  const lang = useUiStore((s) => s.lang);
  const setLang = useUiStore((s) => s.setLang);
  return <LanguagePicker value={lang} onChange={setLang} variant="light" />;
}
