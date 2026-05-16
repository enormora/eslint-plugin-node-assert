export PATH := "./node_modules/.bin:" + env_var("PATH")

default:
	@just --list

compile:
	tsc --build

lint:
	markdownlint "**/*.md"
	eslint . --max-warnings 0
	eslint-doc-generator --check

test-unit: compile
	mocha --enable-source-maps

update-eslint-docs: compile
	eslint-doc-generator

release: update-eslint-docs
	release-it
