import * as mocha from 'mocha';
import { RuleTester } from '@typescript-eslint/rule-tester';

RuleTester.afterAll = mocha.after;
RuleTester.describe = mocha.suite;
RuleTester.it = mocha.test;
RuleTester.itOnly = mocha.test.only;
