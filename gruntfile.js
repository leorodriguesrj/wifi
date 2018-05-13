'use strict';

module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        eslint: {
            options: {
                configFile: '.eslintrc.json'
            },
            target: ['test/*.js']
        },
        tslint: {
            options: {
                configuration: 'tslint.json'
            },
            target: ['*.ts', '!*.d.ts']
        },
        ts: {
            default : {
                tsconfig: './tsconfig.json',
                src: ['**/*.ts', '!node_modules/**', '!**/*.d.ts', 'modules.d.ts']
            }
        },
        typedoc: {
            dist: {
                src: ['./*.ts'],
                options: {
                    excludePrivate: true,
                    mode: 'file',
                    out: 'docs'
                }
            }
        },
        bump: {
            options: {
                files: ['package.json'],
                updateConfigs: [],
                commit: true,
                commitMessage: 'chore(main): add new version tag for version v%VERSION%',
                commitFiles: ['package.json'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: true,
                pushTo: 'origin',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false,
                prereleaseName: false,
                metadata: '',
                regExp: false
            }
        }
    });



    // Default task(s).
    grunt.registerTask('default', ['eslint', 'tslint', 'ts', 'typedoc']);

};
