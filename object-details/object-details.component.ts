import {Component, OnInit, ViewEncapsulation, ViewChild, ElementRef} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ObjectClass, ObjectCompetency, ObjectInspection, ObjectType} from 'app/shared';
import {FormControl, NgForm} from '@angular/forms';
import {ObjectService} from '../../../_services/object.service';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {ReplaySubject} from 'rxjs/ReplaySubject';
import Variable from 'app/variable';
import {ObjectWbsTitle} from '@shared/models/object-wbs-title.model';
import {ObjectZone} from '@shared/models/object-zone.model';
import {InspectionService} from '../../../_services/inspection.service';
import {AppConfigService} from '@shared/services/app-config.service';
import { PrinterService } from '@shared/services/printer.service';

@Component({
    selector: 'app-object-details',
    templateUrl: './object-details.component.html',
    styleUrls: ['./object-details.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class ObjectDetailsComponent implements OnInit {
    public words = Variable.words;
    objectDetail: ObjectInspection;
    language: string;
    readonly: boolean;
    isChanged = false;
    editMode: boolean;
    isCreated: boolean;
    readonlyDesc: SafeHtml;
    test: any;
    private initialState: ObjectInspection;
    public competencies: Array<number> = [];
    paramsToBack;
    public isMainMode: boolean;

    public objectsClassSearchCtrl: FormControl = new FormControl();
    public objectsClassList: Array<ObjectClass> = [];
    public filteredObjectsClassList: ReplaySubject<ObjectClass[]> = new ReplaySubject<ObjectClass[]>(1);

    public objectsTypeSearchCtrl: FormControl = new FormControl();
    public objectTypes: Array<ObjectType> = [];
    public filteredObjectTypes: ReplaySubject<ObjectType[]> = new ReplaySubject<ObjectType[]>(1);

    public objects: Array<ObjectInspection> = [];

    public competencesSearchCtrl: FormControl = new FormControl();
    public objectCompetenciesList: Array<ObjectCompetency> = [];
    public filteredCompetences: ReplaySubject<ObjectCompetency[]> = new ReplaySubject<ObjectCompetency[]>(1);

    public objectsWbsTitleSearchCtrl: FormControl = new FormControl();
    public objectWbsTitleList: Array<ObjectWbsTitle> = [];
    public filteredWbsTitle: ReplaySubject<ObjectWbsTitle[]> = new ReplaySubject<ObjectWbsTitle[]>(1);

    public objectsZoneSearchCtrl: FormControl = new FormControl();
    public objectZoneList: Array<ObjectZone> = [];
    public filteredZones: ReplaySubject<ObjectZone[]> = new ReplaySubject<ObjectZone[]>(1);

    public findObjectsInListCallback = this.findObjectsInList.bind(this);

    @ViewChild('qrImage') qrImage: ElementRef;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private objectService: ObjectService,
        private sanitizer: DomSanitizer,
        private inspectionService: InspectionService,
        private printerService: PrinterService,
        public appConfigService: AppConfigService
    ) {
        this.isMainMode = appConfigService.appConfig.client == 'MAIN';
        this.paramsToBack = this.objectService.params;
        if (route.snapshot.params.hasOwnProperty('id')) {
            this.objectDetail = this.route.snapshot.data['objectDetail'];
            this.readonlyDesc = this.readonlyDesc ? this.sanitizer.bypassSecurityTrustHtml(this.objectDetail.object_desc.replace(/\r?\n/g, '<br/>')) : false;
            if  (!this.objectDetail.qr) {
                this.objectService.generateQRcode(this.objectDetail.object_id, false).subscribe(data => {
                    this.test = data;
                    this.objectDetail.qr = `${data}`;
                });
            }
            this.objectService.getObjectCompetencies(route.snapshot.params['id'])
                .subscribe((res) => {
                    res.data = res.data ? res.data : [];
                    this.competencies = res.data.map((item) => item.competency_id);
                });
        } else {
            this.objectDetail = new ObjectInspection({});
        }
        this.objectService.objectTypes.subscribe(res => {
            this.objectTypes = res.filter(val => {
                if (val['delete_flag'] === false) {
                    val['display_value'] = val['object_type_code'] + ' ' + val['object_type_name'];
                    return true;
                }
                return false;
            });
        });
        this.objectService.getObjectsList().subscribe(res => {
            const objects = res.filter(val => {
                if (val['delete_flag'] === false) {
                    val['display_value'] = val['object_type_code'] + ' ' + val['object_name'];
                    return true;
                }
                return false;
            });
            this.objects = objects;
        });
        this.objectService.getObjectClassList()
            .subscribe((objectsClassList) => {
                this.objectsClassList = objectsClassList;
                this.filteredObjectsClassList.next(
                    objectsClassList.slice().filter(objClass => !objClass.delete_flag)
                );
        });
        this.objectService.getCompetenciesList()
            .subscribe(objectCompetenciesList => {
                this.objectCompetenciesList = objectCompetenciesList;
                this.filteredCompetences.next(objectCompetenciesList.slice());
        });
        this.objectService.getObjectTypeList().subscribe(objectTypes => {
            this.objectTypes = objectTypes;
            this.filteredObjectTypes.next(objectTypes.slice());
        });
        if (!this.isMainMode) {
            this.objectService.getObjectZoneList()
                .subscribe(objectZoneList => {
                    this.objectZoneList = objectZoneList;
                    this.filteredZones.next(objectZoneList.slice());
            });
            this.objectService.getObjectWbsTitleList()
                .subscribe(objectWbsTitleList => {
                    this.objectWbsTitleList = objectWbsTitleList;
                    this.filteredWbsTitle.next(objectWbsTitleList.slice());
            });
        }
        this.language = 'ru';
    }

    ngOnInit() {
        if (this.objectDetail.parent_object_id) {
            this.inspectionService.getObjectById(this.objectDetail.parent_object_id)
                .subscribe((res) => {
                    if (!this.objects.find(obj => obj.object_id === res.object_id)) { // we already have same
                        this.objects.push(res);
                    }
                });
        }
        this.editMode = true;
        this.readonly = this.objectDetail.delete_flag;
        this.initialState = Object.assign({}, this.objectDetail);
        this.isCreated = this.objectService.isCreated;
        this.objectsClassSearchCtrl.valueChanges.subscribe(() => {
            this.objectsFilterHandler('objectsClassSearchCtrl',
                'filteredObjectsClassList',
                'objectsClassList',
                'object_class_name');
        });
        this.objectsTypeSearchCtrl.valueChanges.subscribe(() => {
            this.objectsFilterHandler('objectsTypeSearchCtrl',
                'filteredObjectTypes',
                'objectTypes',
                'object_type_name');
        });
        this.competencesSearchCtrl.valueChanges.subscribe(() => {
            this.objectsFilterHandler('competencesSearchCtrl',
                'filteredCompetences',
                'objectCompetenciesList',
                'competency_name');
        });
        if (!this.isMainMode) {
            this.objectsWbsTitleSearchCtrl.valueChanges.subscribe(() => {
                this.objectsFilterHandler('objectsWbsTitleSearchCtrl',
                    'filteredWbsTitle',
                    'objectWbsTitleList',
                    'title_name');
            });
            this.objectsZoneSearchCtrl.valueChanges.subscribe(() => {
                this.objectsFilterHandler('objectsZoneSearchCtrl',
                    'filteredZones',
                    'objectZoneList',
                    'zone_name');
            });
        }
    }

    public findObjectsInList (searchValue: string) {
        return this.inspectionService.findObjectsInList(searchValue, 'search', '/api/inspection/objects');
    }

    onFormChange() {
        const keys = ['code', 'name', 'desc'];
        this.isChanged = false;
        keys.forEach( key => {
            const field = 'object_' + key,
                oldVal = String(this.initialState[field] || '').trim(),
                val = String(this.objectDetail[field] || '').trim(),
                isChanged = (oldVal !== val);
            if (isChanged) {
                this.isChanged = true;
                return false; // for exit
            }
        });
    }

    private objectsFilterHandler(searchCtrl, filteredObject, array, field) {
        let search = this[searchCtrl].value;
        if (!search) {
            this[filteredObject].next(
                this[array].slice().filter(objClass => !objClass.delete_flag)
            );
            return;
        }
        search = search.toLowerCase();
        this[filteredObject].next(
            this[array]
                .filter(objClass => !objClass.delete_flag)
                .filter(obj => obj[field].toLowerCase().indexOf(search) > -1)
        );
    }

    generateQR(code) {
        if  (code) {
            this.objectService.generateQRcode(code, true).subscribe(data => {
                this.objectDetail.qr = `${data}`;
            });
        } else {
            this.objectService.generateQRcode(this.objectDetail.object_id, true).subscribe(data => {
                this.objectDetail.qr = `${data}`;
            });
        }
    }

    onClickPrintQR() {
        const ctx = this.printerService.makeContextWithImage(this.qrImage.nativeElement as HTMLImageElement);
        this.printerService.print(ctx);
    }

    changeDeleteFlag() {
        if (this.objectDetail.object_id) {
            this.initialState.delete_flag = !this.initialState.delete_flag;
            this.objectService.updateObject(this.initialState).subscribe(res => {
                if (res['status']) {
                    this.objectDetail.delete_flag = this.initialState.delete_flag;
                    this.readonly = this.objectDetail.delete_flag === true;
                } else {
                    alert(res['description']);
                }
            }, err => {
                alert(err['description'][0]);
            });
        }
    }

    objectDescChange($event) {
        this.objectDetail.object_desc = $event;
        this.readonlyDesc = this.readonlyDesc ? this.sanitizer.bypassSecurityTrustHtml(this.objectDetail.object_desc.replace(/\r?\n/g, '<br/>')) : false;
    }

    getObjectClassFull() {
        const objectClass = this.objectsClassList.find(obj =>
            obj.object_class_id === this.objectDetail.object_class_id);

        return objectClass ? objectClass.object_class_full : '';
    }

    getObjectTypeName() {
        const objecTypeId = this.objectDetail.objectType ? this.objectDetail.objectType.object_type_id : this.objectDetail.object_type_id;
        const objectType = this.objectTypes.find(obj =>
            obj.object_type_id === objecTypeId);

        return objectType ? objectType.object_type_name : '';
    }

    getObjectTitleName() {
        const objectWbsTitle = this.objectWbsTitleList.find(obj =>
            (this.objectDetail.title_id[0] && this.objectDetail.title_id[0].title_id) &&
            (obj.title_id === this.objectDetail.title_id[0].title_id));

        return objectWbsTitle ? objectWbsTitle.title_name : '';
    }

    getObjectZoneName() {
        const objectZone = this.objectZoneList.find(obj =>
            (this.objectDetail.zone_id[0] && this.objectDetail.zone_id[0].zone_id) &&
            obj.zone_id === this.objectDetail.zone_id[0].zone_id);

        return objectZone ? objectZone.zone_name : '';
    }

    getCompetenceFull(competence_id: number): string {
        const competency = this.objectCompetenciesList.find(obj =>
            obj.competency_id === competence_id);

        return competency ? `${competency.competency_code} / ${competency.competency_name}` : '';
    }

    deleteCompetence(competence_id: number) {
        this.competencies = this.competencies.filter(c => c !== competence_id);
    }

    selectedItemChange(id, field) {
        if (field) {
            this.objectDetail[field] = id;
        }
    }

    submit(form: NgForm) {
        if (form.submitted && form.valid) {
            if (this.objectDetail.object_id) {
                this.objectService.updateObject(this.objectDetail).subscribe(() => {
                    this.initialState = this.objectDetail;
                });
                this.objectService.setObjectCompetencies(this.objectDetail.object_id, this.competencies)
                    .subscribe();
            } else {
                this.objectService.createObject(this.objectDetail).subscribe(res => {
                    if (res['status'] && res['data']) {
                        const object_id = res['data']['object_id'];
                        if (object_id) {
                            this.generateQR(object_id);
                            this.objectService.setObjectCompetencies(object_id, this.competencies)
                                .subscribe(() => {
                                    this.router.navigate(['/main/catalog/objects', object_id]);
                            });
                        }
                    }
                });
            }
        }
    }
}
