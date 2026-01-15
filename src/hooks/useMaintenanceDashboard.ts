
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

            // 3. SMART CREATE: If no results and looks like a VALID plate (Mercosul/Grey), prompt for new record
            // Regex: 3 Letters + 1 Number + 1 Alphanum + 2 Numbers (Covers ABC1234 and ABC1D23)
            if (results.length === 0) {
                // A. Valid Plate Format -> Offer Registration
                if (cleanSearch.length === 7 && /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(cleanSearch)) {
                    setNotFoundPlate(cleanSearch);
                }
                // B. Invalid Plate Format -> Show Warning
                else if (cleanSearch.length === 7) {
                    toast.warning("Formato de Placa Inválido. Use o padrão Mercosul (ABC1D23) ou Antigo (ABC1234).");
                }
                else if (/^\d/.test(cleanSearch) && cleanSearch.length > 3) {
                    toast.warning("Placas devem começar com letras.");
                }
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
