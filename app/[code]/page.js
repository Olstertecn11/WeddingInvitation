import WeddingInvitation from "../components/WeddingInvitation";

export default async function InvitationPage({ params }) {
  const { code } = await params;
  return <WeddingInvitation initialCode={code} />;
}
