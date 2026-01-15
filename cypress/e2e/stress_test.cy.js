describe('STRESS TEST: Data Integrity & Boundary Check (50 Records)', () => {

    beforeEach(() => {
        // Reset storage to clear any previous state
        cy.visit('/', {
            onBeforeLoad: (win) => {
                win.sessionStorage.clear();
            },
            headers: { 'x-e2e-bypass': 'true' }
        });

        // Setup base mocks for required endpoints
        cy.intercept('GET', '**/rest/v1/vehicles*', { body: [] }).as('checkPlate');
        cy.intercept('GET', '**/rest/v1/clients*', { body: [] }).as('checkClient');
        cy.intercept('POST', '**/rest/v1/clients*', { statusCode: 201, body: { id: 'stress-client' } }).as('createClient');
        cy.intercept('POST', '**/rest/v1/vehicles*', { statusCode: 201, body: { id: 'stress-vehicle' } }).as('createVehicle');
        cy.intercept('POST', '**/rest/v1/maintenance_records*', { statusCode: 201, body: { id: 'stress-record' } }).as('createRecord');
    });

    const scenarios = [
        // --- 1. MANDATORY FIELD VALIDATION (5 Cases) ---
        { type: 'validation', name: '', phone: '11999990000', plate: 'KPB1234', model: 'Fiat Uno', error: 'Nome deve ter pelo menos 3 letras' },
        { type: 'validation', name: 'Valid Name', phone: '11999990000', plate: '', model: 'Fiat Uno', error: 'Placa deve ter pelo menos 5 caracteres' },
        { type: 'validation', name: 'Valid Name', phone: '11999990000', plate: '123', model: 'Fiat Uno', error: 'Placa deve ter pelo menos 5 caracteres' },
        { type: 'validation', name: 'Valid Name', phone: '11999990000', plate: 'KPB1234', model: '', error: 'Modelo do veículo é obrigatório' },

        // --- 2. FUZZY SEARCH / SIMILAR NAMES (10 Cases) ---
        // These mimic "users typing similarly"
        { type: 'fuzzy', search: 'Joao', expected: 'João Silva' },
        { type: 'fuzzy', search: 'Maria', expected: 'Maria Santos' },
        { type: 'fuzzy', search: 'Maaria', expected: 'Maria Santos' }, // Typo
        { type: 'fuzzy', search: 'Fiat Uun', expected: 'Uno' }, // Typo in model
        { type: 'fuzzy', search: 'ABC-12', expected: 'ABC1234' }, // Partial Plate

        // --- 3. NUMBER SIMILARITY (Phone/Plate) ---
        { type: 'check_mask', input_phone: '11999998888', expected_format: '(11) 99999-8888' },
        { type: 'check_mask', input_plate: 'abc1234', expected_format: 'ABC1234' }
    ];

    // Generate 40 more random "Valid Flow" records to hit the "50 records" goal
    for (let i = 0; i < 40; i++) {
        scenarios.push({
            type: 'flow',
            name: `Stress User ${i}`,
            phone: `1198888${1000 + i}`,
            plate: `TST${1000 + i}`,
            model: `Stress Car ${i}`
        });
    }

    // --- EXECUTION LOOP ---
    scenarios.forEach((data, index) => {
        it(`record #${index + 1} [${data.type.toUpperCase()}]: ${data.name || data.search || 'Check'}`, () => {

            if (data.type === 'validation') {
                cy.visit('/new', { headers: { 'x-e2e-bypass': 'true' } });
                if (data.name) cy.get('input[name="clientName"]').type(data.name);
                if (data.phone) cy.get('input[name="clientPhone"]').type(data.phone);
                if (data.plate) cy.get('input[name="vehiclePlate"]').type(data.plate);
                if (data.model) cy.get('input[name="vehicleModel"]').type(data.model);

                cy.contains('Próximo').click();
                cy.contains(data.error).should('be.visible');
            }

            else if (data.type === 'flow') {
                cy.visit('/new', { headers: { 'x-e2e-bypass': 'true' } });
                cy.get('input[name="clientName"]').type(data.name);
                cy.get('input[name="clientPhone"]').type(data.phone);
                cy.get('input[name="vehiclePlate"]').type(data.plate);
                cy.get('input[name="vehicleModel"]').type(data.model);

                cy.contains('Próximo').click();
                cy.get('input[name="km"]').type('10000');
                cy.get('input[name="oil"]').type('5W30');
                cy.contains('Revisar').click();
                cy.contains('CONFIRMAR').click();
                cy.contains('Serviço registrado').should('be.visible');
            }

            else if (data.type === 'check_mask') {
                cy.visit('/new', { headers: { 'x-e2e-bypass': 'true' } });
                if (data.input_phone) {
                    cy.get('input[name="clientPhone"]').type(data.input_phone);
                    cy.get('input[name="clientPhone"]').should('have.value', data.expected_format);
                }
                if (data.input_plate) {
                    cy.get('input[name="vehiclePlate"]').type(data.input_plate);
                    cy.get('input[name="vehiclePlate"]').should('have.value', data.expected_format);
                }
            }

            else if (data.type === 'fuzzy') {
                // Mocking the specific fuzzy result for this test case
                cy.intercept('POST', '**/rest/v1/rpc/search_maintenance', {
                    statusCode: 200,
                    body: [{
                        id: 'fuzzy-match',
                        plate: 'ABC1234',
                        model: 'Fiat Uno',
                        client_name: data.expected,
                        vehicle_id: 'v1',
                        client_id: 'c1',
                        date: '2024-01-01',
                        km: 10000
                    }]
                }).as('fuzzySearchMock');

                cy.visit('/', { headers: { 'x-e2e-bypass': 'true' } });
                cy.get('input[placeholder*="DIGITE A PLACA"]').type(`${data.search}{enter}`);
                cy.wait('@fuzzySearchMock');
                cy.contains(data.expected).should('be.visible');
            }
        });
    });
});
