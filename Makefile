.DEFAULT_GOAL := all

name := assets-proxy

.PHONY: all
all:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-8s\033[0m %s\n", $$1, $$2}'

.PHONY: build
build: ## build Docker image
	docker build --tag $(name) .

.PHONY: run
run: files_dir := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))/files
run: args := --rm --name $(name)
run: args += --publish 8087:8087
run: args += --volume $(files_dir):/root/files:ro
run: ## run assets-proxy container
	docker run $(args) $(name)
