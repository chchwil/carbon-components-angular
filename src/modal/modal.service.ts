import {
	ComponentFactoryResolver,
	ComponentRef,
	ReflectiveInjector,
	ViewContainerRef,
	Injector
} from "@angular/core";
import { Modal } from "./modal.component";
import { ModalPlaceholderService } from "./modal-placeholder.service";
import { ReplaySubject } from "rxjs";
import { Injectable } from "@angular/core";
import { AlertModal } from "./alert-modal.component";
import { AlertModalData } from "./alert-modal.interface";


/**
 * Modal service handles instantiating and destroying modal instances.
 * Uses ModalPlaceholderService to track open instances, and for it's placeholder view reference.
 *
 * ```typescript
 * export class ModalService {
 * 	registerViewContainerRef(vcRef: ViewContainerRef): void {}
 * 	create<T>(data: {component: any, inputs?: any}): void {}
 * 	destroy(index: number = -1): void {}
 * }
 * ```
 * @export
 * @class ModalService
 */
@Injectable()
export class ModalService {
	/**
	 * Creates an instance of `ModalService`.
	 * @param {ComponentFactoryResolver} resolver
	 * @memberof ModalService
	 */
	constructor(public resolver: ComponentFactoryResolver, public placeholder: ModalPlaceholderService) {}

	/**
	 * Creates and renders the modal component that is passed in.
	 * `inputs` is an optional parameter of `data` that can be passed to the `Modal` component.
	 * @template T
	 * @param {{component: any, inputs?: any}} data
	 * @returns {ComponentRef<any>}
	 * @memberof ModalService
	 */
	create<T>(data: {component: any, inputs?: any}): ComponentRef<any> {
		let defaults = {inputs: {}};
		data = Object.assign({}, defaults, data);

		const inputProviders = Object.keys(data.inputs).map(inputName => ({provide: inputName, useValue: data.inputs[inputName]}));
		const injector = Injector.create(inputProviders);
		const factory = this.resolver.resolveComponentFactory(data.component);
		let focusedElement = document.activeElement;
		let component = factory.create(injector);
		component["previouslyFocusedElement"] = focusedElement;  // used to return focus to previously focused element
		this.placeholder.componentRefs.push(component);
		this.placeholder.viewContainerRef.insert(component.hostView);

		component.instance["destroy"] = () => {
			// find the component in the list and call distroy on it
			// this is necessary to keep componentRefs up to date
			let index = this.placeholder.componentRefs.indexOf(component);
			// if found
			if (index >= 0) {
				this.destroy(index);
			}
		};
		return component;
	}

	/**
	 * Creates and renders a new alert modal component.
	 * @param data You can pass in:
	 * `modalType` - "default" | "danger" = "default",
	 * `modalLabel` - a label shown over the title,
	 * `modalTitle` - modal's title,
	 * `modalContent` - modal's content, could include HTML tags.
	 * `buttons` is an array of objects
	 * ```
	 * {
	 * 		text: "Button text",
	 * 		type: "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "danger--primary" = "primary",
	 * 		click: clickFunction,
	 * }
	 * ```
	 * @returns {ComponentRef<any>}
	 * @memberof ModalService
	 */
	show(data: AlertModalData) {
		for (let key of Object.keys(data)) {
			if (["modalType", "modalLabel", "modalTitle", "modalContent"].includes(key)) {
				try {
					throw new Error(`${key} is deprecated, use ${key.replace("modal", "").toLowerCase()} instead`);
				} catch (error) {
					console.warn(error);
				}
			}
		}
		return this.create({
			component: AlertModal,
			inputs: {
				modalType: data.type || data.modalType,
				modalLabel: data.label || data.modalLabel,
				modalTitle: data.title || data.modalTitle,
				modalContent: data.content || data.modalContent,
				buttons: data.buttons || []
			}
		});
	}

	/**
	 * Destroys the modal on the supplied index.
	 * When called without parameters it destroys the most recently created/top most modal.
	 *
	 * @param {any} [index=-1]
	 * @returns
	 * @memberof ModalService
	 */
	destroy(index = -1) {
		// return if nothing to destroy because it's already destroyed
		if (index >= this.placeholder.componentRefs.length || this.placeholder.componentRefs.length === 0) {
			return;
		}
		// on negative index destroy the last on the list (top modal)
		if (index < 0) {
			index = this.placeholder.componentRefs.length - 1;
		}

		this.placeholder.componentRefs[index]["previouslyFocusedElement"].focus();  // return focus
		this.placeholder.componentRefs[index].destroy();
		this.placeholder.componentRefs.splice(index, 1);
	}
}


