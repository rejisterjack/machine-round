import { NdWhatsappIcon } from "@/components/brand/nd-icons";
import { whatsappUrl } from "@/lib/design/tokens";

export function WhatsappFab() {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="nd-whatsapp-fab"
    >
      <NdWhatsappIcon size={28} />
    </a>
  );
}
