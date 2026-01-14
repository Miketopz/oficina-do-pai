
import { createClient } from '@/lib/supabase';

export const analyticsService = {
    async getMonthlyServices(): Promise<number> {
        const supabase = createClient();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count, error } = await supabase
            .from('maintenance_records')
            .select('*', { count: 'exact', head: true })
            .gte('date', thirtyDaysAgo.toISOString());

        if (error) {
            console.error('Error fetching monthly services:', error);
            return 0;
        }

        return count || 0;
    },

    async getTopOil(): Promise<string> {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('maintenance_records')
            .select('oil');

        if (error) {
            console.error('Error fetching oil stats:', error);
            return 'N/A';
        }

        if (!data || data.length === 0) return 'N/A';

        // Count occurrences
        const counts: Record<string, number> = {};
        data.forEach(item => {
            const oil = item.oil || 'Desconhecido';
            counts[oil] = (counts[oil] || 0) + 1;
        });

        // Find max
        let maxCount = 0;
        let topOil = 'N/A';
        for (const [oil, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                topOil = oil;
            }
        }

        return topOil;
    }
};
