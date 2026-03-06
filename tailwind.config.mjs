/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	darkMode: 'media',
	theme: {
		screens: {
			'xs': '375px',
			'xs_only': {'min': '375px', 'max': '575px'},
			'sm': '576px',
			'sm_only': {'min': '576px', 'max': '959px'},	  
			'md': '960px',
			'md_only': {'min': '960px', 'max': '1439px'},
			'lg': '1440px',			
			'lg_only': {'min': '1440px', 'max': '1536px'},	  
			'xl': '1536px',
		},
		extend: {
			color: {
				'logo': '#05202e',
			},
			backgroundColor: {
				'logo': '#92bdd0',
			},
			ringColor: {
				DEFAULT: 'currentColor',
			},
		},
	},
	plugins: [],
}
