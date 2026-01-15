describe('System Integrity & User Flows', () => {

    // Setup for all tests: Mock DB and Bypass Auth
    beforeEach(() => {
        // Bypass Middleware Login
        cy.intercept('GET', '**/rest/v1/vehicles*', { body: [] }).as('checkPlate');
        cy.intercept('GET', '**/rest/v1/clients*', { body: [] }).as('checkClient');

        // Mock successful insertion to allow "Happy Path"
        cy.intercept('POST', '**/rest/v1/clients*', {
            statusCode: 201,
            body: { id: 'new-client-123' }
        }).as('createClient');

        cy.intercept('POST', '**/rest/v1/vehicles*', {
            statusCode: 201,
            body: { id: 'new-vehicle-123' }
        }).as('createVehicle');

        cy.intercept('POST', '**/rest/v1/maintenance_records*', {
            statusCode: 201,
            body: { id: 'new-record-123' }
        }).as('createRecord');

        // Mock Predictions (RPC)
        cy.intercept('POST', '**/rest/v1/rpc/get_predicted_maintenance', {
            statusCode: 200,
            body: [
                {
                    vehicle_id: 'v1',
                    plate: 'PRED999',
                    model: 'Carro do Futuro',
                    client_name: 'Marty McFly',
                    predicted_next_service: new Date(Date.now() + 86400000).toISOString(), // Amanhã
                    avg_km_per_day: 50,
                    confibility_score: 'HIGH'
                }
            ]
        }).as('getPredictions');

        // Mock Fuzzy Search (RPC)
        cy.intercept('POST', '**/rest/v1/rpc/search_maintenance', {
            statusCode: 200,
            body: [
                {
                    id: 's1',
                    plate: 'FUZZY01',
                    model: 'Fusca Errado',
                    client_name: 'João Typo',
                    vehicle_id: 'v2',
                    client_id: 'c2',
                    date: '2024-01-01',
                    km: 50000
                }
            ]
        }).as('fuzzySearch');
    });

    it('VALIDATION: Rejects empty or invalid forms', () => {
        // Visit Page
        cy.visit('/new', { headers: { 'x-e2e-bypass': 'true' } });

        // 1. Try to go Next without filling anything
        cy.contains('Próximo').click();

        // 2. Expect Errors
        cy.contains('Nome deve ter pelo menos 3 letras').should('be.visible');
        cy.contains('Placa deve ter pelo menos 5 caracteres').should('be.visible');
        cy.contains('Modelo do veículo é obrigatório').should('be.visible');

        // 3. Test Invalid Plate
        cy.get('input[name="vehiclePlate"]').type('123'); // Too short
        cy.contains('Próximo').click();
        cy.contains('Placa deve ter pelo menos 5 caracteres').should('be.visible');
    });

    it('FLOW: Complete Registration (Happy Path)', () => {
        cy.visit('/new', { headers: { 'x-e2e-bypass': 'true' } });

        // --- STEP 1: Identification ---
        cy.get('input[name="vehiclePlate"]').type('ABC9999');
        cy.get('input[name="vehicleModel"]').type('Fusca Azul');
        cy.get('input[name="clientName"]').type('Testador Automático');
        cy.get('input[name="clientPhone"]').type('11999998888');

        cy.contains('Próximo').click();

        // --- STEP 2: Service Data ---
        // Should be on Step 2 now
        cy.contains('Troca de Óleo').should('be.visible');

        cy.get('input[name="km"]').type('50000');
        cy.get('input[name="oil"]').type('5W30 Teste');

        // Test Navigation Back
        cy.contains('Voltar').click();
        cy.contains('Placa do Carro').should('be.visible'); // Back to Step 1
        cy.contains('Próximo').click(); // Forward again to Step 2

        // Ensure data persistence or re-fill if needed (Robustness)
        cy.get('input[name="km"]').clear().type('50000');

        cy.wait(500); // Wait for animation
        cy.contains('Revisar').click();

        // --- STEP 3: Summary ---
        cy.contains('Confirmar?', { timeout: 10000 }).should('be.visible');
        cy.contains('Fusca Azul').should('be.visible');

        // Final Submit
        cy.contains('CONFIRMAR').click();

        // Expect Success Toast
        cy.contains('Serviço registrado com sucesso!').should('be.visible');
    });

    it('UI: Input Masks work correctly', () => {
        cy.visit('/new', { headers: { 'x-e2e-bypass': 'true' } });

        // Test Phone Mask
        cy.get('input[name="clientPhone"]').type('11999998888');
        cy.get('input[name="clientPhone"]').should('have.value', '(11) 99999-8888');

        // Test Plate Mask
        cy.get('input[name="vehiclePlate"]').type('abc1234');
        cy.get('input[name="vehiclePlate"]').should('have.value', 'ABC1234');
    });

    it('DASHBOARD: Shows Predictive Alerts', () => {
        // Force reload to ensure hooks fire
        cy.visit('/', {
            headers: { 'x-e2e-bypass': 'true' },
            onBeforeLoad: (win) => {
                win.sessionStorage.clear();
            }
        });

        // Wait for prediction fetch
        cy.wait(['@getPredictions', '@checkClient'], { timeout: 10000 });

        // Ensure loading is finished
        cy.get('body').should('not.contain', 'Carregando...'); // Adjust if you have a specific loading spinner class

        // Assert the Prediction Card is visible
        cy.contains('Próximas Revisões (Estimadas)').should('be.visible');
        cy.contains('PRED999').should('be.visible');
        cy.contains('Marty McFly').should('be.visible');
    });

    it('SEARCH: Fuzzy Logic works', () => {
        cy.visit('/', { headers: { 'x-e2e-bypass': 'true' } });

        // Type a "typo" search
        cy.get('input[placeholder*="DIGITE A PLACA"]').type('Fusca Errado{enter}');

        // Wait for search
        cy.wait('@fuzzySearch');

        // Expect results from the mock
        cy.contains('Fusca Errado').should('be.visible');
        cy.contains('João Typo').should('be.visible');
    });
});
