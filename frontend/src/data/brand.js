// Shared by the public Home page and the Login page, so both look the same.
export const SHOP_NAME = 'Sri Palivela Jewellery'

// Dark overlay + your photo (public/hero.jpg) + a warm black fallback if the photo is missing
export const HERO_BACKGROUND = [
  'linear-gradient(180deg, rgba(8,7,5,0.78) 0%, rgba(8,7,5,0.58) 50%, rgba(8,7,5,0.9) 100%)',
  'url(/hero.jpg) center / cover no-repeat',
  'radial-gradient(ellipse at 50% 38%, rgba(201,164,92,0.14), transparent 62%)',
  'linear-gradient(180deg, #14110c, #0a0908)'
].join(', ')
