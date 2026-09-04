// Constantes de design — reprises exactement de ton site
const NAVY = '#1b2a4a';       // couleur principale du texte et des titres
const BEIGE = '#f5f2eb';      // fond extérieur, identique au thème du site
const MUTED = '#5b7a99';      // bleu-gris doux pour le texte secondaire (au lieu de gris/noir)
const BORDER = '#e3e8f0';     // séparateurs légers, teinte bleutée plutôt que gris neutre

// URL publique de ton logo, hébergé sur Cloudinary
const LOGO_URL =
  process.env.EMAIL_LOGO_URL ||
  'https://res.cloudinary.com/zvzwxe1d/image/upload/v1788040865/mynewstyle/n9b4ybwttyfmwfvwuqmp.png';

// Ta vraie police de site : Plus Jakarta Sans, avec Tajawal en repli (utile
// si un email est généré pour un client ayant choisi l'arabe sur le site)
const FONT_STACK = `'Plus Jakarta Sans', 'Tajawal', 'Helvetica Neue', Arial, sans-serif`;
const FONT_IMPORT_URL =
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&family=Tajawal:wght@300;400;500;700&display=swap';

// Emballage commun à tous les emails :
// - fond extérieur beige (#f5f2eb)
// - carte blanche arrondie
// - bandeau bleu marine avec logo tout en haut (seul endroit en couleur foncée)
// - tout le reste en blanc/beige avec texte bleu marine, jamais de noir
function wrapEmail(bodyHtml, previewText = '') {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>MyNewStyle</title>
<style>
  @import url('${FONT_IMPORT_URL}');
  body, table, td { font-family: ${FONT_STACK}; }
</style>
</head>
<body style="margin:0; padding:0; background-color:${BEIGE}; font-family:${FONT_STACK};">
  <!-- Texte de prévisualisation caché (aperçu dans la boîte de réception) -->
  <div style="display:none; max-height:0; overflow:hidden;">${previewText}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BEIGE}; padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:28px; overflow:hidden; box-shadow:0 10px 40px rgba(27,42,74,0.08); border:1px solid ${BORDER};">

          <!-- Bandeau logo — seul élément en bleu marine plein -->
          <tr>
            <td align="center" style="background-color:${NAVY}; padding:36px 24px;">
              ${
                LOGO_URL
                  ? `<img src="${LOGO_URL}" alt="MyNewStyle" width="150" style="display:block; filter:brightness(0) invert(1);" />`
                  : `<span style="color:#ffffff; font-size:28px; font-weight:800; letter-spacing:1px;">MyNewStyle</span>`
              }
            </td>
          </tr>

          <!-- Contenu — fond blanc, texte bleu marine -->
          <tr>
            <td style="background-color:#ffffff; padding:40px 36px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Pied de page — fond beige, texte bleu marine doux -->
          <tr>
            <td style="background-color:${BEIGE}; padding:28px 36px; text-align:center;">
              <p style="margin:0 0 6px; font-size:12px; color:${NAVY}; font-weight:600;">
                MyNewStyle — Wear Your Confidence
              </p>
              <p style="margin:0; font-size:11px; color:${MUTED};">
                © ${new Date().getFullYear()} MyNewStyle. Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// ============================================================
// Email de vérification de compte (code à 6 chiffres)
// ============================================================
function verificationEmailTemplate({ nom, code }) {
  const body = `
    <h1 style="margin:0 0 12px; color:${NAVY}; font-size:24px; font-weight:800; text-align:center;">
      Bienvenue, ${nom} !
    </h1>
    <p style="margin:0 0 28px; color:${MUTED}; font-size:14px; text-align:center; line-height:1.6;">
      Confirmez votre adresse email pour activer votre compte MyNewStyle.
      Voici votre code de vérification :
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 28px;">
          <div style="display:inline-block; background-color:${BEIGE}; border:2px solid ${NAVY}; border-radius:20px; padding:18px 36px;">
            <span style="font-size:34px; font-weight:800; letter-spacing:10px; color:${NAVY};">
              ${code}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 4px; color:${MUTED}; font-size:12px; text-align:center;">
      Ce code expire dans 15 minutes.
    </p>
    <p style="margin:24px 0 0; color:${MUTED}; font-size:12px; text-align:center; line-height:1.6;">
      Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email —
      aucun compte ne sera activé sans ce code.
    </p>
  `;
  return wrapEmail(body, `Votre code de vérification : ${code}`);
}

// ============================================================
// Email de confirmation de commande (client)
// ============================================================
function orderConfirmationEmailTemplate({ nom, orderId, items, total, adresseLivraison, ville, telephone }) {
  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0; border-bottom:1px solid ${BORDER};">
          <p style="margin:0; font-size:14px; font-weight:700; color:${NAVY};">${item.name}</p>
          <p style="margin:2px 0 0; font-size:12px; color:${MUTED};">${item.color} — Taille ${item.size} — x${item.quantity}</p>
        </td>
        <td style="padding:12px 0; border-bottom:1px solid ${BORDER}; text-align:right; vertical-align:top;">
          <span style="font-size:14px; font-weight:700; color:${NAVY};">${item.price * item.quantity} DA</span>
        </td>
      </tr>`
    )
    .join('');

  const body = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom:8px;">
          <div style="width:56px; height:56px; background-color:${BEIGE}; border:2px solid ${NAVY}; border-radius:50%; display:inline-block; text-align:center; line-height:52px;">
            <span style="color:${NAVY}; font-size:24px;">&#10003;</span>
          </div>
        </td>
      </tr>
    </table>

    <h1 style="margin:16px 0 4px; color:${NAVY}; font-size:22px; font-weight:800; text-align:center;">
      Merci pour votre commande, ${nom} !
    </h1>
    <p style="margin:0 0 28px; color:${MUTED}; font-size:12px; text-align:center;">
      Commande #${orderId}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${itemsRows}
      <tr>
        <td style="padding:16px 0 0; font-size:15px; font-weight:800; color:${NAVY};">Total</td>
        <td style="padding:16px 0 0; text-align:right; font-size:15px; font-weight:800; color:${NAVY};">${total} DA</td>
      </tr>
    </table>

    <div style="background-color:${BEIGE}; border-radius:18px; padding:20px 22px; margin-bottom:8px;">
      <p style="margin:0 0 6px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:${MUTED};">
        Livraison
      </p>
      <p style="margin:0; font-size:14px; color:${NAVY}; line-height:1.5;">
        ${adresseLivraison}, ${ville}<br/>
        Nous vous contacterons au <strong>${telephone}</strong> pour confirmer.
      </p>
    </div>

    <p style="margin:20px 0 0; font-size:12px; color:${MUTED}; text-align:center;">
      Aucun paiement en ligne — le règlement se fait à la livraison.
    </p>
  `;
  return wrapEmail(body, `Votre commande #${orderId} est confirmée`);
}

// ============================================================
// Email de notification interne (nouvelle commande)
// ============================================================
function adminOrderNotificationTemplate({ nomDestinataire, email, telephone, items, total, adresseLivraison, ville, notes, orderId }) {
  const itemsRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid ${BORDER}; font-size:13px; color:${NAVY};">
          ${item.name} — ${item.color}, taille ${item.size} — x${item.quantity}
        </td>
        <td style="padding:10px 0; border-bottom:1px solid ${BORDER}; text-align:right; font-size:13px; font-weight:700; color:${NAVY};">
          ${item.price * item.quantity} DA
        </td>
      </tr>`
    )
    .join('');

  const body = `
    <h1 style="margin:0 0 20px; color:${NAVY}; font-size:20px; font-weight:800;">
      Nouvelle commande #${orderId}
    </h1>

    <p style="margin:0 0 4px; font-size:13px; color:${NAVY};"><strong>Client :</strong> ${nomDestinataire} (${email})</p>
    <p style="margin:0 0 20px; font-size:13px; color:${NAVY};"><strong>Téléphone :</strong> ${telephone}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${itemsRows}
      <tr>
        <td style="padding:14px 0 0; font-size:14px; font-weight:800; color:${NAVY};">Total</td>
        <td style="padding:14px 0 0; text-align:right; font-size:14px; font-weight:800; color:${NAVY};">${total} DA</td>
      </tr>
    </table>

    <p style="margin:0; font-size:13px; color:${NAVY};"><strong>Adresse :</strong> ${adresseLivraison}, ${ville}</p>
    ${notes ? `<p style="margin:8px 0 0; font-size:13px; color:${NAVY};"><strong>Notes :</strong> ${notes}</p>` : ''}
  `;
  return wrapEmail(body, `Nouvelle commande #${orderId}`);
}

module.exports = {
  verificationEmailTemplate,
  orderConfirmationEmailTemplate,
  adminOrderNotificationTemplate,
};