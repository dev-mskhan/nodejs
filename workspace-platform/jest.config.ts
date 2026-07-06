module.exports = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    projects: [
        '<rootDir>/shared',
        '<rootDir>/services/*'
    ],
    coverageDirectory: "<rootDir>/coverage",
    collectCoverageFrom: [
        '**/src/**/*.ts',
        '!**/src/**/*.d.ts'
    ]   
}