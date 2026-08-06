import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const sections = new Set(['marketplaces', 'delivery', 'notifications']);

export const load: PageServerLoad = ({ params }) => {
	if (!sections.has(params.section)) throw error(404, 'Settings section not found.');
};
