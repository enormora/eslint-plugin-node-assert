export PATH := "./node_modules/.bin:" + env_var("PATH")

default:
	@just --list

compile:
	tsc --build

lint: compile
	markdownlint "**/*.md"
	eslint . --cache --cache-location "./target/eslintcache" --cache-strategy content --max-warnings 0
	eslint-doc-generator --check

test-unit:
	mocha

update-eslint-docs: compile
	eslint-doc-generator

test: lint test-unit packtory-dry-run

packtory-dry-run: update-eslint-docs
	packtory publish

release-plan: update-eslint-docs
	packtory release

release-diff: update-eslint-docs
	packtory release-diff

changelog: update-eslint-docs
	packtory changelog

prepare-release: update-eslint-docs
	packtory release --write-changelog --commit --no-dry-run

publish-release: update-eslint-docs
	packtory release --publish --tag --push --github-release --no-dry-run
