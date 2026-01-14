
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { maintenanceService } from '@/services/maintenanceService';
import { analyticsService } from '@/services/analyticsService';
import { Service, Vehicle, ClientWithFleet } from '@/types';

export function useMaintenanceDashboard() {
    const [recentServices, setRecentServices] = useState<Service[]>([]);
    const [fleet, setFleet] = useState<Vehicle[]>([]); // Keep for search compatibility if needed, or remove
    const [clients, setClients] = useState<ClientWithFleet[]>([]);
    const [stats, setStats] = useState({ monthly: 0, topOil: 'N/A' });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [services, clientsData, monthlyCount, topOil] = await Promise.all([
                maintenanceService.getRecentServices(),
                maintenanceService.getClientsWithFleet(),
                analyticsService.getMonthlyServices(),
                analyticsService.getTopOil()
            ]);
            setRecentServices(services);
            setClients(clientsData);
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

    // Filter clients for the separate tab
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm))
    );

    return {
        recentServices,
        clients,
        filteredClients,
        stats,
        searchTerm,
        setSearchTerm,
        loading,
        handleSearch,
        reloadFleet: async () => {
            const updated = await maintenanceService.getClientsWithFleet();
            setClients(updated);
        }
    };
}
