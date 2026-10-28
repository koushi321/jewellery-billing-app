// ─────────────────────────────────────────────────────────────
// Palivela Jewellery: details shown on the public home page.
// Edit the values between the quotes, save, and push to GitHub.
// Anything left empty ('') is simply hidden on the page.
// ─────────────────────────────────────────────────────────────
export const shopInfo = {
  name   : 'Palivela Jewellery',
  tagline: 'Gold and silver jewellery, from a family you can trust',
  years  : '20+',

  // Example: 'Main Road, Vizianagaram, Andhra Pradesh 535002'
  address: 'Salur Mainroad Opp Bengaluru Ayyangar Bakery Salur, Andhra Pradesh 535591',

  // Example: '+91 98765 43210'
  phone: '+91 9440541796',

  // Digits only, with country code. Example: '919876543210'
  whatsapp: '919440541796',

  // One line per row. Example: { days: 'Monday to Saturday', time: '10:00 AM to 8:30 PM' }
  hours: [{ days: 'Monday to Sunday', time: '9:00 AM to 8:30 PM' }],

  // Paste your Google Maps share link. Example: 'https://maps.app.goo.gl/xxxxxxxx'
  mapsLink: 'https://maps.app.goo.gl/aTnwDShqEsPjyxiX6',

  // Optional: Google Maps -> Share -> Embed a map -> copy only the src="..." link
  mapsEmbed: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d236.45380120507332!2d83.20318329913538!3d18.5171121917012!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a3ba2dfa48a04f9%3A0x230937f02bb57fba!2sSalur%2C%20Andhra%20Pradesh%20535591!5e0!3m2!1sen!2sin!4v1793153064669!5m2!1sen!2sin" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>',

  // What you want to show customers. Add or remove rows as you like.
  offerings: [
    {
      title: 'Gold Jewellery',
      text : 'Traditional and modern gold ornaments for weddings, festivals and everyday wear.'
    },
    {
      title: 'Silver Jewellery',
      text : 'Silver ornaments and articles for gifts, pooja and special occasions.'
    }
  ]
}
