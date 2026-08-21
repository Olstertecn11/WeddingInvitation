export const CEREMONY_ROLE_DETAILS = {
  bridesmaid: {
    role: "Dama de boda",
    modalClass: "for-lady",
    headline: "Nuestra boda también lleva tu luz",
    chosenText: "Has sido elegida como",
    greetingPrefix: "Querida",
    body:
      "Te elegimos porque tu cariño, tu alegría y tu forma de acompañarnos han sido parte de nuestra historia. Queremos que camines con nosotros desde un lugar muy especial en este día que guardaremos para siempre.",
    closing:
      "Gracias por aceptar ser una dama de boda en la ceremonia de Analucía y Oliver.",
    whatsappUrl: "https://chat.whatsapp.com/JrxqgjK1gVrFdLrg0G6nI1",
    meetingTitle: "Reunión de Damas | Boda de Analucía y Oliver",
    meetingTime: "Domingo, 23 de agosto · 6:00 - 7:00pm",
    meetUrl: "https://meet.google.com/dpr-msxo-ert",
  },
  groomsman: {
    role: "Caballero de boda",
    modalClass: "for-gentleman",
    headline: "Nuestra boda también lleva tu presencia",
    chosenText: "Has sido elegido como",
    greetingPrefix: "Querido",
    body:
      "Te elegimos porque tu apoyo, tu amistad y tu forma de estar presente significan mucho para nosotros. Queremos que nos acompañes desde un lugar especial en la ceremonia y en este capítulo de nuestra vida.",
    closing:
      "Gracias por aceptar ser un caballero de boda en la ceremonia de Analucía y Oliver.",
    whatsappUrl: "https://chat.whatsapp.com/CGRQFOS1JpcLQtEdMqv8XJ",
    meetingTitle: "Reunión de Caballeros | Boda de Analucía y Oliver",
    meetingTime: "Domingo, 23 de agosto · 7:00 - 8:00pm",
    meetUrl: "https://meet.google.com/yfx-yxur-nvr",
  },
};

export function getCeremonyRoleDetails(role) {
  return CEREMONY_ROLE_DETAILS[role] || null;
}
