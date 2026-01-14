
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { maintenanceService } from '@/services/maintenanceService';
import { analyticsService } from '@/services/analyticsService';
import { Service, Vehicle } from '@/types';

export function useMaintenanceDashboard() {
    const [recentServices, setRecentServices] = useState<Service[]>([]);
    const [fleet, setFleet] = useState<Vehicle[]>([]);
    const [stats, setStats] = useState({ monthly: 0, topOil: 'N/A' });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [services, vehicles, monthlyCount, topOil] = await Promise.all([
                maintenanceService.getRecentServices(),
                maintenanceService.getFleet(),
                analyticsService.getMonthlyServices(),
                analyticsService.getTopOil()
            ]);
            setRecentServices(services);
            setFleet(vehicles);
            setStats({ monthly: monthlyCount, topOil });
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar dados iniciais.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!searchTerm.trim()) {
            setLoading(true);
            try {
                const services = await maintenanceService.getRecentServices();
                setRecentServices(services);
            } catch (error) {
                toast.error("Erro ao recarregar atividades.");
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        try {
            const results = await maintenanceService.search(searchTerm);
            setRecentServices(results);
        } catch (error) {
            console.error('Erro na busca:', error);
            toast.error('Erro ao realizar a busca.');
        } finally {
            setLoading(false);
        }
    };

    const reloadFleet = async () => {
        try {
            const vehicles = await maintenanceService.getFleet();
            setFleet(vehicles);
        } catch (error) {
            console.error(error);
        }
    };

    // Filter fleet for the separate tab
    const filteredFleet = fleet.filter(v =>
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return {
        recentServices,
        fleet,
        filteredFleet,
        stats,
        searchTerm,
        setSearchTerm,
        loading,
        handleSearch,
        reloadFleet
    };
}
