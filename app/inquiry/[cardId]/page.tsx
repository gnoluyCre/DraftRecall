// input: route params; output: inquiry room route; pos: recall route wrapper, update this header and app/README.md when changed.
import { InquiryRoom } from "@/components/inquiry-room";

export default function InquiryPage({ params }: { params: { cardId: string } }) {
  return <InquiryRoom cardId={params.cardId} />;
}
