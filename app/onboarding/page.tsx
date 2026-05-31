import { requireUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  await requireUser();
  // NOT: "mağazan varsa dashboard'a git" guard'ı YOK — server action sonrası refresh
  // mağaza oluşunca seni akışın ortasında dışarı atardı. /onboarding aynı zamanda
  // "yeni mağaza ekle" akışı olarak da kullanılır.
  return <OnboardingWizard />;
}
