import { Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ObjectService } from '../../../_services/object.service';
import { ObjectInspection, IPagination, ObjectCompetency, ObjectClass } from 'app/shared';
import { UserService } from '../../../../shared';
import { TakeUntilDestroy, untilDestroyed, OnDestroy } from 'ngx-take-until-destroy';
import { ItrCellSort, ItrTableConfig } from '../../../../shared/modules/table/table.interfaces';
import { ItrTableComponent } from '../../../../shared/modules/table/components/itr-table/itr-table.component';

const SOURCE_IS_BACKEND = true;

interface ObjectListQueryParams {
  page: number;
  pageSize: number;
  orderBy: 'object_code' | 'object_name' | 'object_label_name' | 'org_name' | 'department_name' | 'parent_object';
  asc: boolean;
  archive: any;
  /** это не сортировка, а selected row */
  object_id: number;
  object_type_id: string;
  org_name: string;
  department_name: string;
  competences: string;
}

@TakeUntilDestroy()
@Component({
  selector: 'app-objects-list',
  templateUrl: './objects-list.component.html',
  styleUrls: ['./objects-list.component.scss'],
})
export class ObjectsListComponent implements OnInit, OnDestroy {
  @ViewChild('itrTable') itrTable: ItrTableComponent<any>;
  @ViewChild('searchInput') searchInput: HTMLElement;
  @ViewChildren('list') list: QueryList<ElementRef>;
  public objectsList: ObjectInspection[] = [];

  private sortConfig: ItrCellSort = { field: undefined, sortType: undefined };
  private loadedPages: number[] = [];
  private nextPage;
  public pagination: IPagination;
  public addition: ObjectInspection[] = [];

  /** mark to replace objectsList */
  private isLoaded: boolean;

  public source = SOURCE_IS_BACKEND;
  public isSearchShown = false;
  public isActive = true;
  public pageIndex = 1;
  public queryParams: ObjectListQueryParams;


  filter = {
    sort_order: {
      field: 'object_code',
      asc: true
    },
    values: {
      delete_flag: false,
    },
    search_text: ''
  };


  public showMessage = true;
  public selectedObject: ObjectInspection;
  public isScrollable = true;
  public selectedIndex: number = null;

  public objectCompetenciesList: Array<ObjectCompetency> = [];
  public objectsClassList: Array<ObjectClass> = [];

  public displayedColumns = [
    'object_code',
    'object_name',
    'object_label_name',
    'org_name',
    'department_name',
    'competenceString',
    'object_class_name',
    'parent_object_name',
  ];

  public tableKey = 'objects6';
  public isInitParams = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ObjectService,
    public user: UserService,
    private objectService: ObjectService,
  ) { }

  ngOnInit() {
    if (this.params) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: this.params,
      });
      this.isInitParams = true;
    }
    this.route.queryParams.subscribe((queryParams: ObjectListQueryParams) => {
      this.queryParams = { ...queryParams, };
      if (this.isInitParams) {
          this.queryParams = this.params;
          this.isInitParams = false;
      } else {
          this.params = this.queryParams;
      }
      this.filter.sort_order.field = this.queryParams.orderBy;
      this.filter.sort_order.asc = this.queryParams.asc;
      this.isActive = !this.queryParams.hasOwnProperty('archive');
      this.filter.values.delete_flag = !this.isActive;
      this.getList();
      this.filter = { ...this.filter };
    });

    this.objectService.pagination.pipe(untilDestroyed(this))
      .subscribe(p => this.pagination = p);

    this.objectService.getCompetenciesList()
      .subscribe((objectCompetenciesList) => {
        this.objectCompetenciesList = objectCompetenciesList;
      });

    this.objectService.getObjectClassList()
      .subscribe((objectsClassList) => {
        this.objectsClassList = objectsClassList;
      });
  }

  ngOnDestroy() {
  }

  public set params(queryParams: ObjectListQueryParams) {
    localStorage.setItem(`itr-table-${this.tableKey}`, JSON.stringify(queryParams));
  }
  public get params(): ObjectListQueryParams {
    return JSON.parse(localStorage.getItem(`itr-table-${this.tableKey}`));
  }

  private getList() {
    const requestParams = {
      page: this.pageIndex,
      ...this.queryParams,
    };
    requestParams.archive = !this.isActive;
    this.service.getObjectsList(requestParams)
      .pipe(untilDestroyed(this))
      .subscribe(list => {
        if (!this.isLoaded) {
          this.objectsList = list;
          this.isLoaded = true;
          setTimeout(() => {
            this.scrollTo(this.objectsList);
          }, 500);
          this.loadedPages.push(this.pagination.page);
        } else {
          this.addition = list.filter((item) => {
            return !this.objectsList.find(objectItem => objectItem.object_id === item.object_id);
          });
          this.objectsList = this.objectsList.concat(this.addition);
        }
        console.log('loaded page', this.pagination.page, '   length', list.length, '   total pages', this.pagination.pagesCount);
      });
  }

  public toggleActive() {
    this.isActive = !this.isActive;
    this.refresh();
    this.navigate();
  }

  // public onSearchChange() {
  //   this.searchConfig = this.filter.search_text;
  //   this.navigate();
  // }

  public toggleSearch(el: HTMLElement): void {
    if (this.filter.search_text === '') {
      this.isSearchShown = !this.isSearchShown;
      if (this.isSearchShown) {
        setTimeout(() => el.focus());
      }
    }
  }

  public selectObj(obj: ObjectInspection) {
    this.selectedObject = obj;
    this.navigate();
  }

  public scrollTo(arr: ObjectInspection[]) {
    if (!this.isScrollable || !arr.length) {
      return;
    }
    console.log('scroll');
    // this.isScrollable = false;
    if (this.route.snapshot.queryParams.object_id) {
      this.selectedObject = arr.find(obj => {
        return obj.object_id === Number(this.route.snapshot.queryParams.object_id);
      });
      this.selectedIndex = arr.indexOf(this.selectedObject);
    }
    if (this.selectedIndex !== -1) {
      setTimeout(() => this.itrTable.scrollTo(this.itrTable._itemHeight * this.selectedIndex));
    }
  }

  public filterUpdate(arr: Array<any>) {
    if (!arr || !arr.length) {
      this.showMessage = true;
    } else {
      this.showMessage = false;
    }
  }

  // public resetSearch(): void {
  //   this.filter.search_text = '';
  //   this.isSearchShown = false;
  //   this.navigate();
  // }

  public createObject(): void {
    this.router.navigate(['/main/catalog/objects/new']);
    this.objectService.isCreated = true;
  }

  public editObject(object_id: number): void {
    this.router.navigate(['/main/catalog/objects', object_id]);
    this.objectService.isCreated = false;
  }

  public onSortChange(sort: ItrCellSort) {
    if (sort
      // если сортировка не изменилась, то ничего не делаем
      && (sort.field !== this.sortConfig.field || sort.sortType !== this.sortConfig.sortType)
    ) {
      this.sortConfig = sort;
      this.refresh();
      this.navigate();
      console.log({ sort });
    }
  }

  // public onConfigChange(config: ItrTableConfig) {
  //   this.filterConfig = config.cells
  //     .filter(cell => cell.field.filter && cell.field.filter.length)
  //     .map(cell => ({
  //       field: cell.field.value,
  //       values: cell.field.filter,
  //     }));

  //   this.navigate();
  // }

  private navigate() {
    const queryParams: ObjectListQueryParams = this.queryParams || {} as ObjectListQueryParams;

    if (this.sortConfig && this.sortConfig.field) {
      queryParams.orderBy = this.sortConfig.field as any;
      if (this.sortConfig.sortType === 'asc') {
        queryParams.asc = true;
      } else {
        delete queryParams.asc;
      }
    }

    if (!this.isActive) {
      queryParams.archive = '';
    } else {
      delete queryParams.archive;
    }

    if (this.selectedObject) {
      queryParams.object_id = this.selectedObject.object_id;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  onNextPage(_nextPage: number) {
    const nextPage = _nextPage + 1;
    if (nextPage === this.nextPage) { // same next page
      return;
    }
    this.nextPage = nextPage;

    if (
      this.loadedPages.includes(nextPage) // already loaded
      || !this.pagination // no data
      || this.nextPage < 1 // no perform first load on scroll
      || nextPage > this.pagination.pagesCount // dont load not existed page
      ) {
      return;
    }

    this.nextPage = nextPage;
    this.loadedPages.push(nextPage);
    this.pageIndex = this.nextPage;
    this.getList();

  }

  onUpdateSearch(evt) {
    // console.log('search', evt);

    // blank start up value
    if (evt.field === '0') {
      return;
    }
    // set value
    this.queryParams[evt.field] = evt.value;
    // remove value if empty
    if (evt.value === '') {
      delete this.queryParams[evt.field];
    }
    this.refresh();
    this.navigate();
  }

  private refresh() {
    this.objectsList = [];
    this.isLoaded = false;
    this.pageIndex = 1;
    this.nextPage = null;
    this.loadedPages = [];
  }

}
