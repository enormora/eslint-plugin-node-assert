export PATH := "./node_modules/.bin:" + env_var("PATH")

default:
	@just --list

compile:
	tsc --build

lint: compile
	markdownlint "**/*.md"
	eslint . --max-warnings 0
	eslint-doc-generator --check

test-unit:
	mocha

update-eslint-docs: compile
	eslint-doc-generator

release: compile lint test-unit update-eslint-docs
	release-it
