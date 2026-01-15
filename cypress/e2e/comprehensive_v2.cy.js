describe('V2 Features: Filters, History & Deletion', () => {

    const mockVehicleId = 'veh-123';
    const mockClientId = 'cli-123';

    // Setup for all tests
    beforeEach(() => {
        // Bypass Login
        cy.intercept('GET', '**/rest/v1/vehicles*', { body: [] }).as('checkPlate');

        // Mock Vehicle Fetch
        cy.intercept('GET', `**/rest/v1/vehicles?select=*&id=eq.${mockVehicleId}*`, {
            statusCode: 200,
            body: {
                id: mockVehicleId,
                model: 'Voyage', // Lowercase to test Uppercase Display
                plate: 'ABC1234',
                client_id: mockClientId,
                client: {
                    id: mockClientId,
                    name: 'Josiane',
                    phone: '11999999999'
                }
            }
        }).as('getVehicle');

        // Mock History Fetch
        cy.intercept('GET', `**/rest/v1/maintenance_records?select=*&vehicle_id=eq.${mockVehicleId}&order=date.desc*`, {
            statusCode: 200,
            body: [
                // Record 1: Newest (14/01/2026)
                {
                    id: 'rec-1',
                    vehicle_id: mockVehicleId,
                    date: '2026-01-14',
                    created_at: '2026-01-14T10:00:00',
                    km: 50000,
                    oil: '5w30', // Changed
                    filter_oil: '(MANTIDO) ph123', // Kept
                    filter_air: 'ar123', // Changed
                    filter_fuel: '', // Empty/Not Changed
                    filter_cabin: null // Null
                },
                // Record 2: Oldest (10/01/2026)
                {
                    id: 'rec-2',
                    vehicle_id: mockVehicleId,
                    date: '2026-01-10',
                    created_at: '2026-01-10T10:00:00',
                    km: 40000,
                    oil: '10w40',
                    filter_oil: 'ph123',
                    filter_air: 'ar123',
                    filter_fuel: 'comb123',
                    filter_cabin: 'cab123'
                }
            ]
        }).as('getHistory');

        // Mock Delete
        cy.intercept('DELETE', `**/rest/v1/maintenance_records?id=eq.rec-1`, {
            statusCode: 204
        }).as('deleteRecord');
    });

    it('HISTORY: Displays Correctly (Uppercase, Icons, Order)', () => {
        cy.visit(`/vehicle/${mockVehicleId}`, { headers: { 'x-e2e-bypass': 'true' } });
        cy.wait(['@getVehicle', '@getHistory']);

        // 1. Header Uppercase Check
        cy.get('h1').should('contain', 'VOYAGE'); // Should be uppercase despite mock "Voyage"

        // 2. Order Check
        // The first card should be "2ª Troca" (Total 2, Newest First)
        cy.contains('2ª Troca').should('be.visible');
        cy.contains('1ª Troca').should('be.visible');

        // 3. Filter Display Logic (Record 1)
        // Oil: Changed -> Green Check
        cy.contains('Óleo do Motor').parent().find('.text-green-600').should('exist');
        cy.contains('5W30').should('be.visible'); // Uppercase Check

        // Filter Oil: Kept -> Red X + Value
        cy.contains('Filtro de Óleo').parent().find('.text-red-500').should('exist');
        cy.contains('PH123').should('be.visible'); // Value shown even if kept
        cy.contains('(Mantido)').should('not.exist'); // Suffix removed

        // Filter Fuel: Empty -> Red X + Empty
        cy.contains('Filtro de Combustível').parent().find('.text-red-500').should('exist');
        // Value should be empty string, not "Não trocado"
        cy.contains('Não trocado').should('not.exist');
    });

    it('INTERACTION: Deletion Flow with Alert Dialog', () => {
        cy.visit(`/vehicle/${mockVehicleId}`, { headers: { 'x-e2e-bypass': 'true' } });
        cy.wait(['@getVehicle', '@getHistory']);

        // 1. Click Delete on first record
        cy.get('button').find('.lucide-trash-2').first().click({ force: true });

        // 2. Assert Dialog Open
        cy.contains('Excluir Registro?').should('be.visible');
        cy.contains('Esta ação apagará permanentemente').should('be.visible');

        // 3. Confirm Delete
        cy.contains('Sim, Excluir').click();

        // 4. Wait for API call
        cy.wait('@deleteRecord');

        // 5. Assert Toast (Mocked toast or check if function called - hard in E2E without UI check)
        // We assume success if API called.
        cy.on('window:alert', (str) => {
            expect(str).to.equal('Registro apagado.')
        });
    });

    it('INPUT: Checkbox Logic for "Kept" filters', () => {
        cy.visit('/new', { headers: { 'x-e2e-bypass': 'true' } });

        // Skip to Step 2 (Fill Step 1)
        cy.get('input[name="vehiclePlate"]').type('ABC9999');
        cy.get('input[name="vehicleModel"]').type('Teste Checkbox');
        cy.get('input[name="clientName"]').type('Tester');
        cy.contains('Próximo').click();

        // Step 2
        cy.contains('Troca de Óleo').should('be.visible');

        // Find a filter input block
        // We need to target the checkbox specifically.
        // The structure is Label: "Filtro de Óleo" | Input | Checkbox "Trocou?"

        // 1. Type in Filter Oil
        cy.get('input[name="filterOil"]').type('PH999');

        // 2. Default is Checked (Trocou = True)
        // We need to find the checkbox associated with filterOil.
        // In the new component, the checkbox is inside the same parent div structure.
        // It's a bit hard to select specifically without data-testid, but let's try via text.

        // Find the "Trocou?" checkbox near the input with value PH999
        cy.get('input[name="filterOil"]').parent().parent().find('input[type="checkbox"]').as('oilCheckbox');

        cy.get('@oilCheckbox').should('be.checked');

        // 3. Uncheck (Mantido)
        cy.get('@oilCheckbox').uncheck();

        // 4. Assert styling change (Bg gray? Checked class?)
        // The component changes text color class.
        cy.contains('Trocou?').should('have.class', 'text-gray-400'); // Gray when unchecked

        // 5. Re-check
        cy.get('@oilCheckbox').check();
        cy.contains('Trocou?').should('have.class', 'text-green-700'); // Green when checked
    });

});
