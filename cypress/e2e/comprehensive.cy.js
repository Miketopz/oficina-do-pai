describe('System Integrity & User Flows', () => {

    // Setup for all tests: Mock DB and Bypass Auth
    beforeEach(() => {
        // Bypass Middleware Login
        cy.intercept('GET', '**/rest/v1/vehicles*', { body: [] }).as('checkPlate');
        cy.intercept('GET', '**/rest/v1/clients*', { body: [] }).as('checkClient');

        // Mock successful insertion to allow "Happy Path"
        cy.intercept('POST', '**/rest/v1/vehicles', {
            statusCode: 201,
            body: { id: 'new-vehicle-123' }
        }).as('createVehicle');

        cy.intercept('POST', '**/rest/v1/clients', {
            statusCode: 201,
            body: { id: 'new-client-123' }
        }).as('createClient');

        cy.intercept('POST', '**/rest/v1/maintenance_records', {
            statusCode: 201,
            body: { id: 'new-record-123' }
        }).as('createRecord');
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
});
