import { Component, Input, OnInit, OnDestroy, TemplateRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { ObjectType, SideModalService } from 'app/shared';
import { ObjectService } from '../../../_services/object.service';
import { NgForm } from '@angular/forms';
import { Subject } from 'rxjs/Subject';

@Component({
  selector: 'app-object-type',
  templateUrl: './object-type.component.html',
  styleUrls: ['./object-type.component.scss']
})

export class ObjectTypeComponent implements OnInit, OnDestroy {
  @Output() changed = new EventEmitter();
  @ViewChild('objectTypeTemplate') objectTypeTemplate: TemplateRef<any>;
  @ViewChild('objectTypeForm') objectTypeForm: NgForm;
  @Input() objectType: ObjectType = new ObjectType();
  public hasChanged: Subject<any> = new Subject<any>();
  public readonly = false;
  public isCreate = false;
  public isChange = false;
  public disableSave = false;
  private initialState: ObjectType;

  constructor(
    private sideModalService: SideModalService,
    private objectService: ObjectService,
  ) {
    this.isCreate = true;
  }

  ngOnInit() {
    this.createForm();
    this.sideModalService.hide();
  }

  ngOnDestroy() {
    this.sideModalService.hide(true);
  }

  private onFormChange() {
    const keys = ['code', 'name', 'desc'];
    this.isChange = false;
    keys.forEach( key => {
      const field = 'object_type_' + key,
        oldVal = String(this.initialState[field] || '').trim(),
        val = String(this.objectType[field] || '').trim(),
        isChange = (oldVal !== val);
      if (isChange) {
        this.isChange = true;
        return false; // for exit
      }
    });
  }

  resetForm() {
    this.isChange = false;
    if (this.objectTypeForm) {
      this.objectTypeForm.resetForm(this.initialState);
    }
  }

  setInitialState() {
    if (this.objectType) {
      this.initialState = Object.assign({}, this.objectType);
    }
  }

  private createForm() {
    this.resetForm();
    this.objectType = new ObjectType();
    this.setInitialState();
    this.readonly = false;
    this.isChange = false;
    this.disableSave = false;
    this.sideModalService.show(this.objectTypeTemplate);
  }

  create() {
    this.createForm();
    this.isCreate = true;
  }

  edit(entity: ObjectType) {
    this.resetForm();
    this.objectType = entity;
    this.setInitialState();
    this.readonly = this.initialState.delete_flag;
    this.isCreate = false;
    this.isChange = false;
    this.disableSave = false;
    this.sideModalService.show(this.objectTypeTemplate);
  }

  changeDeleteFlag() {
    if (this.objectType.object_type_id) {
      this.initialState.delete_flag = !this.initialState.delete_flag;
      this.updateItemFlag();
    }
  }

  private updateItemFlag() {
    this.resetForm();
    this.disableSave = true;
    this.objectService.updateObjectType(this.initialState).subscribe(res => {
      if (res['status']) {
        this.objectType.delete_flag = this.initialState.delete_flag;
        this.objectService.objectTypesSwitch.next(!this.objectType.delete_flag); // switch objects list
        this.readonly = this.objectType.delete_flag;
        this.setInitialState();
        this.hasChanged.next({ action: 'filter' });
        this.changed.emit();
        this.isChange = false;
      } else {
        this.onSubmitError(res['description']);
      }
    }, err => {
      this.onSubmitError(err['description'][0]);
    });
  }

  private updateItem() {
    this.objectService.updateObjectType(this.objectType).subscribe(res => {
      this.onSubmitSuccess(res);
    }, err => {
      this.onSubmitError(err['description'][0]);
    });
  }

  private createItem() {
    this.objectService.createObjectType(this.objectType).subscribe(res => {
      if (res['status']) {
        this.objectService.objectTypesSwitch.next(true);
        this.objectType.object_type_id = res.object_type_id;
        this.objectType.delete_flag = false;
        this.isCreate = false;
        this.changed.emit(this.objectType);
      }
      this.onSubmitSuccess(res);
    }, err => {
      this.onSubmitError(err['description'][0]);
    });
  }

  private onSubmitSuccess(res) {
    if (res['status']) {
      this.setInitialState();
      this.hasChanged.next({ action: 'update' });
      this.onFormChange();
      this.sideModalService.hide();
    } else {
      this.onSubmitError(res['description']);
    }
    this.disableSave = false;
  }

  private onSubmitError(mes = 'Ошибка сохранения') {
    this.disableSave = false;
    console.warn(mes);
  }

  submit(form: NgForm) {
    if (!form.submitted || !form.valid) { return; }
    this.disableSave = true;
    if (this.objectType.object_type_id) {
      this.updateItem();
    } else {
      this.createItem();
    }
    this.changed.emit();
  }
}
