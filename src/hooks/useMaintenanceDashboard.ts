
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { maintenanceService } from '@/services/maintenanceService';
import { analyticsService } from '@/services/analyticsService';
import { Service, Vehicle, ClientWithFleet } from '@/types';

export function useMaintenanceDashboard() {
    const [recentServices, setRecentServices] = useState<Service[]>([]);
    const [fleet, setFleet] = useState<Vehicle[]>([]);
    const [clients, setClients] = useState<ClientWithFleet[]>([]);
    const [predictions, setPredictions] = useState<any[]>([]); // New State
    const [stats, setStats] = useState({ monthly: 0, topOil: 'N/A' });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const [notFoundPlate, setNotFoundPlate] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [services, clientsData, monthlyCount, topOil, predictedData] = await Promise.all([
                maintenanceService.getRecentServices(),
                maintenanceService.getClientsWithFleet(),
                analyticsService.getMonthlyServices(),
                analyticsService.getTopOil(),
                analyticsService.getPredictedMaintenance() // New Fetch
            ]);
            setRecentServices(services);
            setClients(clientsData);
            setPredictions(predictedData);
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
            // 1. SMART CHECK: Is it an existing plate?
            const cleanSearch = searchTerm.trim().toUpperCase().replace('-', '');

            // Only try direct plate lookup if it looks like a plate (alphanumeric, < 9 chars)
            if (cleanSearch.length >= 3 && cleanSearch.length <= 8) {
                const vehicleId = await maintenanceService.getVehicleByPlate(cleanSearch);
                if (vehicleId) {
                    router.push(`/vehicle/${vehicleId}`);
                    return;
                }
            }

            // 2. Perform Standard Fuzzy Search (Backend)
            const results = await maintenanceService.search(searchTerm);
            setRecentServices(results);

            // 3. SMART CREATE: If no results and looks like a plate, prompt for new record
            if (results.length === 0 && cleanSearch.length >= 5 && cleanSearch.length <= 7 && /^[A-Z0-9]+$/.test(cleanSearch)) {
                setNotFoundPlate(cleanSearch);
            }

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
        notFoundPlate,
        setNotFoundPlate,
        predictions, // Exposed
        reloadFleet: async () => {
            const updated = await maintenanceService.getClientsWithFleet();
            setClients(updated);
        }
    };
}
