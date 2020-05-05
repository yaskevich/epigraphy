var fldsAll = 
{"cir":"СIR","og":"OG","xx":"Век","yr":"Год","pub":"Публикация","pubform":"Форма прошлых публикаций","name":"Наименование надписи","transcript":"Практическая транскрипция","place":"Местонахождение","ogl":"Шифр места","dim":"Размеры носителя","objtype":"Тип памятника","genre":"Содержание надписи","mat":"Материал носителя","method":"Способ изготовления","carv":"Резьба","carvcut":"Техника врезной резьбы","carvrel":"Техника рельефной резьбы","let":"Тип письма","letvar":"Вариация типа письма","lang":"Язык","orn":"Орнамент","pict":"Изображения","paint":"Краска","inscond":"Сохранность надписи","objcond":"Сохранность носителя","orig":"Подлинность","template":"Шаблон","doc":"Документирование","operators":"Операторы","authors":"Авторы", "published": "Статус"};



var fldsFilters = {
    "xx":"Век", "dummy1":"Заглушка1", "dummy2":"Заглушка2", "dummy3":"Заглушка3",
    "objtype":"Тип памятника", "genre":"Содержание надписи", "mat":"Материал носителя", "method":"Способ изготовления", 
    "carv":"Резьба", "lang":"Язык", "orn":"Орнамент", "inscond":"Сохранность надписи",
    "carvcut":"Техника врезной резьбы", "let":"Тип письма", "pict":"Изображения", "objcond":"Сохранность носителя",
    "carvrel":"Техника рельефной резьбы", "letvar":"Вариация типа письма", "paint":"Краска", "orig":"Подлинность"
    
// ,
    // "cir":"СIR","og":"OG","xx":"Век","yr":"Год","pub":"Публикация","pubform":"Форма прошлых публикаций","name":"Наименование надписи","transcript":"Практическая транскрипция","place":"Местонахождение","ogl":"Шифр места","dim":"Размеры носителя","template":"Шаблон","doc":"Документирование","operators":"Операторы","authors":"Авторы", "published": "Статус"
 };


var flds  = {"cir":"СIR","og":"OG", "yr":"Год", "photo": "Фото", "name":"Наименование надписи", "transcript":"Практическая транскрипция", "place":"Местонахождение"};


var fieldsPlacesAll = {"ogl":"OGL","name":"Объект","place":"Населенный пункт","region":"Регион","district":"Район","county":"Уезд","suburb":"Историческое название района (для городов)","monastery":"Монастырь","lat":"LAT","lon":"LON","country":"Страна","address":"Адрес","shot":"Съемка выполнена","planned":"План","fact":"Факт","gis":"ГИС","checked":"Проверка","og":"OG","cir":"CIR","rus":"RUS","ueg":"UEG","incompl":"Висяки","comments":"Комментарии","completed":"Статус","comment":"Комментарий","maker":"Исполнитель"};

var fieldsPlaces = {"ogl":"OGL","name":"Объект","place":"Населенный пункт","region":"Регион","district":"Район","county":"Уезд","suburb":"Историческое название района (для городов)","monastery":"Монастырь","country":"Страна"
// ,"address":"Адрес"
};

$(function() {
	var pathname = window.location.pathname;
	console.log(pathname);
	
	// if (pathname === "/" ) {
	if (pathname === "/" ) {
		var template = $('#drop').html();
		var records = [];
		var hiddens = [];
		var filtersDisabled = {};
		var headers = [];
		var headers_places = [];
		var filterLabels = {};
		var filters_obj = {};
		var mapping = {};
		var ogls = [];
		var regions = [];
		var counties = [];
		var sites = [];
		
		var allCount = 0;
		$('input:radio[name="checksort"]#sort-id').click();
		$('input:radio[name="checkfilters"]#check-all').click(); // .attr('checked', true);        
		$('.switch-filters').prop('checked', false);
		$(".place-finder").val('');
	
		$('.setup').removeClass('is-hidden');
		$('.nav-loc').click(function() {
			$('.cirtable').addClass('is-hidden');
			$('.toggle-filters').addClass('is-hidden');
			$('.loctable').removeClass('is-hidden');
			$('.nav-ins').removeClass('bold');
			$('.nav-loc').addClass('bold');

			$('.setup').addClass('is-hidden');
			$('.filters2').addClass('is-hidden');
			$('.switch-filters').prop('checked', false);
		});

		$('.nav-ins').click(function() {
			$('.cirtable').removeClass('is-hidden');
			$('.toggle-filters').removeClass('is-hidden');
			$('.nav-loc').removeClass('bold');

			$('.loctable').addClass('is-hidden');
			$('.nav-ins').addClass('bold');
			$('.setup').removeClass('is-hidden');
		});

		$('.switch-filters').click(function() {
			$('.filters2').toggleClass('is-hidden');
			$('.filters-show').toggleClass('is-hidden');
			$('.filters-hide').toggleClass('is-hidden');
		})

		$(".toggle-filters").click(function() {
			$('.filters2').toggleClass('is-hidden');
			$('.filters-show').toggleClass('is-hidden');
			$('.filters-hide').toggleClass('is-hidden');
		});

		$("input[name='checksort']").change(function() {
			var attr = $(this).attr("id").split('-')[1];
			var result = $('table.cirtable > tbody > tr').sort(function(a, b) {
				var contentA = parseInt($(a).data(attr));
				var contentB = parseInt($(b).data(attr));
				return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
			});
			$('table.cirtable > tbody').html(result);
		});

		$('.modal-background').click(function() {
			$('#modal-img.modal').removeClass("is-active");
		});
		$('button.delete, button.cancel').click(function() {
			$('#modal-img.modal').removeClass("is-active");
		});

		$.getJSON("data", function(data) {
			
			records = data.records;
			var places_features = data.places_features;
			$('.update').html("Обновлено " + data.update);
				allCount = data.records.length;
				showCount();
			$.each(data.features, function(key, val) {
				filters_obj.hasOwnProperty(val["f"]) ? filters_obj[val["f"]].push(val) : filters_obj[val["f"]] = [val];
			});
			// console.log(filters_obj);
			
			var cnt = 0;
			$.each(fldsFilters, function(key, val) {
				var colnum = cnt > 3 ? cnt % 4 : cnt;
				// var rendered = '<button class="button dropfilter dropbody">[заглушка]</button>';
				var rendered = '<button class="button dropfilter dropbody"></button>';
				if (!key.match(/^dummy/i)) {
					filtersDisabled[key] = [];
					filters_obj[key].push(filters_obj[key].shift());
					rendered = Mustache.render(template, {
						"code": key,
						"title": val,
						"items": key === "xx" ? filters_obj[key].map(function(x) {
							if (x.v) {
								x.v = x.v
									.replace("15", "XV")
									.replace("16", "XVI")
									.replace("17", "XVII")
									.replace("18", "XVIII");
							}
							return x;
						}) : filters_obj[key]
					});
				}
				$('.fcol' + colnum).append(rendered);
				++cnt;
			});

			for (var p in places_features) {
				if (places_features.hasOwnProperty(p)) {
					var v = places_features[p];
					if (v['f'] == "region") {
						regions.push(v);
					} else if (v['f'] == "county") {
						counties.push(v);
					}
				}
			}

			regions.push(regions.shift());
			counties.push(counties.shift());

			var rendered_regions = Mustache.render(template, {
				"code": "region",
				"title": "Область на 2020 год",
				"items": regions
			});
			filtersDisabled["region"] = [];
			
			var rendered_counties = Mustache.render(template, {
				"code": "county",
				"title": "Уезд на 1678 год",
				"items": counties
			});
			filtersDisabled["county"] = [];

			$('.fcol5').append(rendered_regions);
			$('.fcol5').append(rendered_counties);

			// $.each(flds, function(key, val) {
				// console.log("headers", key);
				// headers.push("<th id='header" + key + "'>" + val + "</li>");
			// });

			// $(".cirtable>thead").append("<tr>" + headers.join("") + "</tr>");
			
			$(".cirtable>thead").append($('#cir-headers').html());
			
			$.each(fieldsPlaces, function(key, val) {
				headers_places.push("<th id='" + key + "'>" + val + "</li>");
			});

			$(".loctable>thead").append("<tr>" + headers_places.join("") + "</tr>");

			var tbody = data.records.map(function(d) {
				// console.log(d);
				// return "<tr><td>" + d.id + "</td><td>" + d.og + "</td><td>" 
				// data-tippy-content
				// .replace("CIR", "")
				// abbr(d.name, 48)
				var year = d.yr ? d.yr.substring(0, 4) : 2000;
				// console.log(year);
				var warn = d.ogl ? '' : 'Местонахождение не атрибутировано! (Отсутствует OGL)';

				return "<tr data-yr=" + year + " data-id=" + d.id + " id='id" + d.id + "'>" + cell(d.cir) + cell(d.og) + cell(d.yr) + "<td><img class='preview' src='preview.jpg'/></td>" +"<td><img class='preview' src='preview.jpg'/></td>" + cell(d.name) + cellClassed(d.transcript, "transcript") + cell(d.ogl ? d.place : (d.place || '') + "<div class='red bold'>Местонахождение не атрибутировано!</div>") + "</tr>";
			});

			$(".cirtable>tbody").append(tbody);

			var tbodyLoc = data.places.map(function(d) {
				var tr = "<tr id=" + d.ogl + ">";
				ogls.push(d.ogl);
				sites.push({
					value: d.name || '(пусто)',
					data: d.ogl
				});

				for (a in fieldsPlaces) {
					var val = d[a];
					var numval = parseInt(val);
					if (numval && data.places_features_sorted.hasOwnProperty(numval)) {
						// console.log(numval, data.places_features[numval]);
						val = data.places_features_sorted[numval].v;
					}
					tr += cell(val);
				}
				return tr + "</tr>";
			});
			
			$(".loctable>tbody").append(tbodyLoc);
			
			var options = {
				lookup: sites,
				onSelect: function(suggestion) {
					filtersDisabled["ogl"] = jQuery.grep(ogls, function(value) {
					  return value != suggestion.data;
					});
					console.log('You selected: ' + suggestion.value + ', ' + suggestion.data);
					// console.log(filtersDisabled["ogl"]);
					applyFilters();
				}

			};

			$(".place-finder").autocomplete(options);

			tippy('[data-tippy-content]', {
				"placement": 'bottom',
				"maxWidth": 260
			});		

			$(document).on('click', '.filtering', function() {
				// var str = $(this).attr('id');
				var state = $(this).prop("checked");
				console.log("filter", state);
				var feature = $(this).data("feature");
				var id = $(this).data("id").toString();

				if (state) {
					filtersDisabled[feature] = jQuery.grep(filtersDisabled[feature], function(el) {
						return el != id;
					});
				} else { 
					// console.log(typeof id);
					filtersDisabled[feature].push(id); 
				}
				
				// console.log(filtersDisabled, feature, id);
				var method = filtersDisabled[feature].length ? 'removeClass' : 'addClass';
				$(this).parents().eq(3).find('div.dropdown-trigger > button.button > span > .fa-filter')[method]('is-hidden');
				applyFilters();
			}).on('click', '.timeslider', function () {
				// $(this).trigger('change');
				console.log("kkkk");
			}).on("click", "img.preview", function() {
				$('#modal-img.modal').addClass("is-active");
			}).on("click", ".clear-place", function() {
				$('.place-finder').val('');
				filtersDisabled["ogl"] = [];
				applyFilters();
			}).on("click", ".all-clear", function() {
				for (var dis in filtersDisabled) {
					filtersDisabled[dis] = [];
				}
				$('.userfilter').addClass('is-hidden');
				$('.filtering').prop('checked', true);
				$('.place-finder').val('');
				applyFilters();
				
			}).on("click", ".filter-clean,.filter-check", function() {
				var cls = $(this).attr("class");
				var checkAll = cls === "filter-check";
				var code = $(this).parent().data('feature');
				var userfilter = $(this).parents().eq(3).find('div.dropdown-trigger > button.button > span > .fa-filter');
				var feats = [];
				$(this)
					.parent()
					.parent()
					.children(".dropdown-item")
					.each(function(index) {
						var that = $(this).children("input");
						feats.push(that.data("id").toString());
						that.prop('checked', checkAll);
				});

				if (checkAll) {
					filtersDisabled[code] = [];
					userfilter.addClass('is-hidden')
				} else {
					userfilter.removeClass('is-hidden')
					filtersDisabled[code] = feats;
				}
				applyFilters();
				// console.log(filtersDisabled, cls);
			});
		});
	} else {
		// single
		
		
		
		$.getJSON("data", function(data) {
			var records = data.records;
			var template = $('#card').html();
			var rendered = Mustache.render(template, records[0]);
			$('.single').html(rendered);
			
			var slider = document.querySelector( '.timeslider' );			
			
			$(document).on('change', '.timeslider', function (event) {
				 var newv=$(this).val();
				$(this).next().text(newv);
			})
			
			
		});
			
			
			
		
	}

    function applyFilters() {
		// console.log(filtersDisabled);
        $.each(records, function(key, val) {
			var isShown = true;
			for (var dis in filtersDisabled) {
				var ids = filtersDisabled[dis];
				if (ids.length) {
					var isDis = ids.indexOf(val[dis]) !==-1;
					// console.log(ids, val[dis], typeof ids[0], typeof val[dis]);
					if (isDis){
						// console.log(dis, ids, val[dis], isDis, val.id);
						isShown = false;
						break;
					}
				}
			}
			
			var hid_index = hiddens.indexOf(val.id);
			
			if(isShown &&  hid_index >= 0) {
				$('tr#id' + val.id).removeClass('is-hidden');
                hiddens.splice(hid_index, 1);
			}
			if (!isShown && hid_index == -1){
				$('tr#id' + val.id).addClass('is-hidden');
				hiddens.push(val.id)
			}
			// kek();
        });
		showCount();
		
    }
    function cellClassed(s, cls) {
        return "<td class='" + cls+ "'>" + (s || "<span class='no'>▪</span>") + "</td>";
    }
    function cell(s, tip) {
        return "<td" + (tip ? ' data-tippy-content="' + tip + '"' : '') + ">" + (s || "<span class='no'>▪</span>") + "</td>";
    }
    function abbr(s, l) {
        s = s || "";
        return s.length >= l ? cell(s.substring(0, l) + '...', s) : cell(s);
    }
	function showCount(){
		$('.count').html(allCount-hiddens.length+" из "+allCount);
	}
	
	
	
	
});