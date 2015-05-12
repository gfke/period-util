/*
 * gfk-period
 *
 * Copyright (c) 2015
 */
'use strict';
/*global module, define, require */

var moment      = require('moment'),
    momentRange = require('moment-range'),
    api,
    Period,
    Unit,
    REGEX_IS_UNIT,
    REGEX_IS_UNIT_AND_NUMBER,
    PERIOD_MODES;

moment.locale('de', {
    week: {
        dow: 1, // Monday is the first day of the week.
        doy: 4  // The week that contains Jan 4th is the first week of the year.
    }
});

PERIOD_MODES = {
    DAYS: 'd',
    WEEKS: 'w',
    MONTHS: 'm',
    QUARTERS: 'q',
    HALFYEARS: 'h',
    YEARS: 'y',
    TOTAL: 't',
    YTD: 'ytd'
};

REGEX_IS_UNIT_AND_NUMBER = new RegExp('^(' +
    '(' + PERIOD_MODES.DAYS + '[1-3]?[0-9]?[0-9])|' +
    '(' + PERIOD_MODES.WEEKS + '[1-5]?[0-9])|' +
    '(' + PERIOD_MODES.MONTHS + '1?[0-9])|' +
    '(' + PERIOD_MODES.QUARTERS + '[1-4])|' +
    '(' + PERIOD_MODES.HALFYEARS + '[1-2])' +
    ')$'
);

REGEX_IS_UNIT = new RegExp('^(' +
    '(' + PERIOD_MODES.DAYS + ')|' +
    '(' + PERIOD_MODES.WEEKS + ')|' +
    '(' + PERIOD_MODES.MONTHS + ')|' +
    '(' + PERIOD_MODES.QUARTERS + ')|' +
    '(' + PERIOD_MODES.HALFYEARS + ')|' +
    '(' + PERIOD_MODES.YEARS + ')|' +
    '(' + PERIOD_MODES.TOTAL + '[' + PERIOD_MODES.DAYS + PERIOD_MODES.WEEKS + PERIOD_MODES.MONTHS + PERIOD_MODES.QUARTERS + PERIOD_MODES.HALFYEARS + PERIOD_MODES.YEARS + ']?)|' +
    '(' + PERIOD_MODES.YTD + ')' +
    ')$'
);


/**
 * Returns the quarter number of the given timestamp
 *
 * @param time
 * @returns {number}
 */
function getQuarterNoFromTime(time) {
    var date = new Date(time),
        month = date.getMonth(),
        no = Math.floor(month / 3) + 1;
    return no;
}

/**
 * Returns the halfyear number of the given timestamp
 *
 * @param time
 * @returns {number}
 */
function getHalfyearNoFromTime(time) {
    var date = new Date(time),
        month = date.getMonth(),
        no = Math.floor(month / 6) + 1;
    return no;
}

/**
 * Replaces our internal placeholders for quarters and halfyears in the given
 * string by the appropriate values of the timestamp:
 *
 * %Q% is replaced by the quarter number of the timestamp
 * %H% is replaced by the half year number of the timestamp
 *
 * @param time
 * @param result
 * @returns {String}
 */
function replaceCustomPlaceholders(time, result) {
    var no;

    if (-1 !== result.indexOf('%Q%')) {
        no = getQuarterNoFromTime(time);
        result = result.replace('%Q%', no);
    }
    if (-1 !== result.indexOf('%H%')) {
        no = getHalfyearNoFromTime(time);
        result = result.replace('%H%', no);
    }
    return result;
}

/**
 * Returns the string for the given UTC timestamp and date format
 *
 * @param time
 * @param format
 * @returns {String}
 */
function getStringForUtcTimeAndFormat(time, format) {
    var result;

    if ('string' === typeof time) {
        time = parseInt(time, 10);
    }
    if (time === 0) {
        return '';
    }
    result = replaceCustomPlaceholders(time, moment(time).utc().format(format));
    return result;
}


/**
 * Converts the given timestamp to a format and returns the result as integer value
 *
 * @param time
 * @param format
 * @returns {Number}
 */
function getIntForTimeAndFormat(time, format) {
    var int;

    int = parseInt(moment(time).utc().format(format), 10);
    return int;
}

// --------------------------------------------------
//  Unit
// --------------------------------------------------

/**
 * A unit object is a helper object which provides methods for a certain period unit provided
 * by the DWH Api. The unit is given by an ID string
 *
 * @param id
 * @constructor
 */
Unit = function (id) {
    if (!isValidUnit(id)) {
        throw new Error('Invalid unit id "' + id + '" given!');
    }
    this.id = id;
    this.longFormat = null;
    this.shortFormat = null;
    this.longDisplayFormat = null;
};

/**
 * Returns whether the unit is a total or not
 *
 * @returns {boolean}
 */
Unit.prototype.isTotal = function () {
    var isTotal = (this.id[0] === PERIOD_MODES.TOTAL);
    return isTotal;
};

/**
 * Returns whether the unit is a yearly unit or not
 *
 * @returns {boolean}
 */
Unit.prototype.isYearly = function () {
    if (this.isYtd()) {
        return true;
    }
    if (this.isTotal()) {
        return false;
    }
    if (this.id.length !== 1) {
        return true;
    }
    return false;
};

/**
 * Returns whether the unit is a YTD unit or not
 *
 * @returns {boolean}
 */
Unit.prototype.isYtd = function () {
    var isYtd = (this.id === PERIOD_MODES.YTD);
    return isYtd;
};

/**
 * Returns the short date format which should be used to format dates of this unit
 *
 * @returns {String}
 */
Unit.prototype.getShortFormat = function () {
    if (null === this.shortFormat) {
        this.shortFormat = getShortPeriodFormat(this.id);
    }
    return this.shortFormat;
};

/**
 * Returns the long date format which should be used to format dates of this unit
 *
 * @returns {null|*}
 */
Unit.prototype.getLongFormat = function () {
    if (null === this.longFormat) {
        this.longFormat = getLongPeriodFormat(this.id);
    }
    return this.longFormat;
};


Unit.prototype.getLongStringDisplayFormat = function () {
    if (null === this.longDisplayFormat) {
        this.longDisplayFormat = getLongPeriodDisplayFormat(this.id);
    }
    return this.longDisplayFormat;
};

/**
 * Returns the given timestamp as string using the long format
 *
 * @param time
 * @returns {String}
 */
Unit.prototype.getLongStringForTime = function (time) {
    return getStringForUtcTimeAndFormat(time, this.getLongFormat());
};

/**
 * Returns the given timestamp as string using the short format
 *
 * @param time
 * @returns {String}
 */
Unit.prototype.getShortStringForTime = function (time) {
    return getStringForUtcTimeAndFormat(time, this.getShortFormat());
};

// --------------------------------------------------
//  Period
// --------------------------------------------------

/**
 * A Period describes a time range from end to start and provides all dates
 * in the period in different formats
 * The provided dates are always expanded to stretch over complete periods
 * @param {string} periodMode Describes which time unit the period uses
 * @param {date|moment} start The date on which the period starts
 * @param {date|moment} end The date on which the period ends
 * @constructor
 */
Period = function (periodMode, start, end) {
    //TODO:Make variables private and expose setters and getters
    this.periodMode = periodMode;
    this.start = moment(start);
    this.end = moment(end);

    expandRangeToCompletePeriods(this.start, this.end, this.periodMode);

    this.values = null;
    this.checksum = this.getChecksum();

};

Period.prototype.getLongPeriodLabel = function () {
    var labelStart = this.getLongStringForStart(),
        labelEnd = this.getLongStringForEnd();

    return labelStart + ' - ' + labelEnd;
};

Period.prototype.isEqual = function (periodToCompare) {
    var hasSameStart,
        hasSameEnd,
        hasSamePeriodMode;

    hasSameStart = this.start.isSame(periodToCompare.start);
    hasSameEnd = this.end.isSame(periodToCompare.end);
    hasSamePeriodMode = this.periodMode === periodToCompare.periodMode;

    return hasSameStart && hasSameEnd && hasSamePeriodMode;
};

Period.prototype.getChecksum = function () {
    var startCheckSum = this.start.unix(),
        endCheckSum = this.end.unix();

    return this.periodMode + '/' + startCheckSum + '/' + endCheckSum;
};

Period.prototype.isDirty = function () {
    return this.checksum !== this.getChecksum();
};

Period.prototype.getLongStringForStart = function () {
    return this.start.format(getLongPeriodFormat(this.periodMode));
};

Period.prototype.getLongStringForEnd = function () {
    return this.end.format(getLongPeriodFormat(this.periodMode));
};

Period.prototype.getLongStringFormat = function () {
    return getLongPeriodFormat(this.periodMode);
};

Period.prototype.getShortStringFormat = function () {
    return getShortPeriodFormat(this.periodMode);
};

Period.prototype.getGroupStringFormat = function () {
    return getPeriodGroupFormat(this.periodMode);
};

/**
 * Returns array of DTOs with all dates the period consists of, grouped by its PeriodMode
 * Checks if the start and end values have been altered and recalculates if so
 * @returns array {{key: (string), value: (moment)}}
 */
Period.prototype.getValueAsObjects = function () {
    if (this.values !== null && this.isDirty() === false) {
        return this.values;
    }
    var periodInstance = this,
        momentRangeIterator = getMomentRangeIterator(this.periodMode),
        currentRange = moment().range(this.start, this.end);


    this.values = [];
    currentRange.by(momentRangeIterator, function (momentToUse) {
        momentToUse.isNewGroup = isNewPeriodGroup(periodInstance.periodMode, momentToUse);
        periodInstance.values.push(momentToUse);
    });

    this.checksum = this.getChecksum();
    return this.values;
};

function expandRangeToCompletePeriods(start, end, periodMode) {
    setPeriodToMinimum(start, periodMode);
    setPeriodToMaximum(end, periodMode);
}

function setPeriodToMinimum(momentToUse, periodMode) {
    switch (periodMode) {
        case PERIOD_MODES.WEEKS:
            momentToUse.weekday(0);
            break;
        case PERIOD_MODES.MONTHS:
            momentToUse.date(1);
            break;
        case PERIOD_MODES.QUARTERS:
            momentToUse.date(1);
            switch (momentToUse.quarter()) {
                case 1:
                    momentToUse.month(0);
                    break;
                case 2:
                    momentToUse.month(3);
                    break;
                case 3:
                    momentToUse.month(6);
                    break;
                case 4:
                    momentToUse.month(9);
                    break;
            }
            break;
        case PERIOD_MODES.YEARS:
            momentToUse.date(1);
            momentToUse.month(0);
            break;
    }
}

function setPeriodToMaximum(momentToUse, periodMode) {
    switch (periodMode) {
        case PERIOD_MODES.WEEKS:
            momentToUse.weekday(6);
            break;
        case PERIOD_MODES.MONTHS:
            momentToUse.date(1).add(1, 'months').subtract(1, 'days');
            break;
        case PERIOD_MODES.QUARTERS:
            //When setting dates to maximum, always set the month first
            // else you might set it to a higher date than the current month
            // and it will bubble up and mess up the date
            switch (momentToUse.quarter()) {
                case 1:
                    momentToUse.month(2);
                    momentToUse.date(31);
                    break;
                case 2:
                    momentToUse.month(5);
                    momentToUse.date(30);
                    break;
                case 3:
                    momentToUse.month(8);
                    momentToUse.date(30);
                    break;
                case 4:
                    momentToUse.month(11);
                    momentToUse.date(31);
                    break;
            }
            break;
        case PERIOD_MODES.YEARS:
            momentToUse.month(11);
            momentToUse.date(31);
            break;
    }
}

/**
 * Create a new key/value object from give moment with provided period set to a new value
 * Used as DTO for the front end
 * @param {string} periodMode Period which will be altered
 * @param {moment} momentToUse Moment object that will be cloned and formatted (provided moment will not be altered)
 * @param {number} [newValue=null] number the given period will be set to
 * @returns {{key: (string), value: (moment)}}
 */
function createDateObject(periodMode, momentToUse, newValue) {
    var formatToUse = getShortPeriodFormat(periodMode),
        clonedMoment = moment(momentToUse);

    if (newValue) {
        setPeriodOnMoment(periodMode, clonedMoment, newValue);
    }

    return {
        key: clonedMoment.format(formatToUse),
        value: clonedMoment
    };
}


function getLongPeriodDisplayFormat(periodMode) {
    if (periodMode === 'ytd') {
        return '[YTD] YYYY';
    }
    switch (periodMode[0]) {
        case PERIOD_MODES.DAYS:
            return 'DD.MM.YYYY';
        case PERIOD_MODES.WEEKS:
            return '[KW] W GGGG';
        case PERIOD_MODES.MONTHS:
            return 'MMMM YYYY';
        case PERIOD_MODES.QUARTERS:
            return '[Q.]Q YYYY';
        case PERIOD_MODES.YEARS:
            return 'YYYY';
        case PERIOD_MODES.TOTAL:
            return '';
    }
    throw 'No long period format found for "' + periodMode + '"';
}

function getShortPeriodFormat(periodMode) {
    if (periodMode === PERIOD_MODES.YTD) {
        return '[YTD] YY';
    }
    switch (periodMode[0]) {
        case PERIOD_MODES.DAYS:
            return 'YYYY-MM-DD';
        case PERIOD_MODES.WEEKS:
            return '[KW] W \'GG';
        case PERIOD_MODES.MONTHS:
            return 'MMM \'YY';
        case PERIOD_MODES.QUARTERS:
            return '[Q.%Q%] \'YY';
        case PERIOD_MODES.HALFYEARS:
            return '[H%H%] \'YY';
        case PERIOD_MODES.YEARS:
            return 'YYYY';
        case PERIOD_MODES.TOTAL:
            return '';
    }
    throw 'No short period format found for "' + periodMode + '"';
}

function getLongPeriodFormat(periodMode) {
    if (periodMode === PERIOD_MODES.YTD) {
        return '[YTD] YYYY';
    }
    switch (periodMode[0]) {
        case PERIOD_MODES.DAYS:
            return 'YYYY-MM-DD';
        case PERIOD_MODES.WEEKS:
            return '[KW] W GGGG';
        case PERIOD_MODES.MONTHS:
            return 'MMMM YYYY';
        case PERIOD_MODES.QUARTERS:
            return '[Q%Q%] YYYY';
        case PERIOD_MODES.HALFYEARS:
            return '[H%H%] YYYY';
        case PERIOD_MODES.YEARS:
            return 'YYYY';
        case PERIOD_MODES.TOTAL:
            return '';
    }
    throw 'No long period format found for "' + periodMode + '"';
}

function getPeriodGroupFormat(periodMode) {
    if (periodMode === PERIOD_MODES.YTD) {
        return '[YTD] YYYY';
    }
    switch (periodMode[0]) {
        case PERIOD_MODES.DAYS:
            return 'DD. MMMM';
        case PERIOD_MODES.WEEKS:
            return '[KW] W GGGG';
        case PERIOD_MODES.MONTHS:
            return 'MMMM YYYY';
        case PERIOD_MODES.QUARTERS:
            return '[Quartal] Q YYYY';
        case PERIOD_MODES.YEARS:
            return 'YYYY';
        case PERIOD_MODES.TOTAL:
            return '';
    }
    throw 'No long period format found for "' + periodMode + '"';
}

function getMomentSetterFunction(periodMode) {
    switch (periodMode) {
        case PERIOD_MODES.DAYS:
            return 'date';
        case PERIOD_MODES.WEEKS:
            return 'week';
        case PERIOD_MODES.MONTHS:
            return 'month';
        case PERIOD_MODES.QUARTERS:
            return 'quarter';
        case PERIOD_MODES.YEARS:
            return 'year';
    }
    throw 'No moment setter found for period "' + periodMode + '"';
}

/**
 * Show if the group of the date change according to given periodMode
 * Days are grouped in months, so this will return true on the first of every month
 * @param {string} periodMode
 * @param {moment} momentToUse
 * @returns {boolean}
 */
function isNewPeriodGroup(periodMode, momentToUse) {
    switch (periodMode) {
        case PERIOD_MODES.DAYS:
            return momentToUse.date() === 1;
        case PERIOD_MODES.WEEKS:
            return momentToUse.date() === 1;
        case PERIOD_MODES.MONTHS:
        case PERIOD_MODES.QUARTERS:
            return momentToUse.dayOfYear() === 1;
        case PERIOD_MODES.YEARS:
            return true;
    }
    throw 'No newGroup rule found for period "' + periodMode + '"';
}

function getMomentRangeIterator(periodMode) {
    switch (periodMode) {
        case PERIOD_MODES.DAYS:
            return 'days';
        case PERIOD_MODES.WEEKS:
            return 'weeks';
        case PERIOD_MODES.MONTHS:
            return 'months';
        case PERIOD_MODES.QUARTERS:
            return 'quarters';
        case PERIOD_MODES.YEARS:
            return 'years';
    }
    throw 'No moment setter found for period "' + periodMode + '"';
}

function setPeriodOnMoment(periodMode, moment, value) {
    var setterFunction = getMomentSetterFunction(periodMode);
    moment[setterFunction](value);
}

/**
 * Get the count of days in a specific month
 * @param {number} year Year of the date to be used
 * @param {number} month Zero based month to be used
 * @returns {number}
 */
function getNumberOfDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Returns the maximum number for the given unit or null if the unit
 * does not have a number
 *
 * @param unit
 * @returns {Int|null}
 */
function getMaxNumberForUnit(unit) {
    var max = null;

    switch (unit) {
        case PERIOD_MODES.DAYS:
            max = 366;
            break;
        case PERIOD_MODES.WEEKS:
            max = 53;
            break;
        case PERIOD_MODES.MONTHS:
            max = 12;
            break;
        case PERIOD_MODES.QUARTERS:
            max = 4;
            break;
        case PERIOD_MODES.HALFYEARS:
            max = 2;
            break;
    }
    return max;
}

/**
 * Returns whether the given id string represents a valid unit or not
 *
 * @param {String} id
 * @returns {Boolean}
 */
function isValidUnit(id) {
    var isValid,
        num,
        unit;

    if (REGEX_IS_UNIT_AND_NUMBER.test(id)) {
        unit = id[0];
        num = parseInt(id.substr(1), 10);
        isValid = ((num !== 0) && (getMaxNumberForUnit(unit) >= num));
    } else {
        isValid = REGEX_IS_UNIT.test(id);
    }
    return isValid;
}

api = {};

/**
 * Create a new instance of Period
 * @param {string} periodMode PeriodMode of this instance
 * @param {date|moment} start The date on which the period starts
 * @param {date|moment} end The date on which the period ends
 * @returns {Period}
 */
api.createPeriod = function (periodMode, start, end) {
    return new Period(periodMode, start, end);
};

/**
 * Returns whether the given id is a valid unit or not
 *
 * @param id
 * @returns {Boolean}
 */
api.isValidUnit = function (id) {
    return isValidUnit(id);
};

/**
 * Returns an period unit instance for the given id or throws an
 * exception if the id does not represent a valid period unit
 *
 * @param id
 * @returns {Unit}
 */
api.getUnit = function (id) {
    return new Unit(id);
};

/**
 * Returns the ISO week number of the given UTC timestamp
 *
 * @param time
 * @returns {Number}
 */
api.getIsoWeekNoFromTime = function (time) {
    return getIntForTimeAndFormat(time, 'W');
};

/**
 * Returns the ISO week year of the given UTC timestamp
 *
 * @param time
 * @param short
 * @returns {Number}
 */
api.getIsoWeekYearFromTime = function (time, short) {
    return getIntForTimeAndFormat(time, short ? 'GG' : 'GGGG');
};

/**
 * Returns the quarter number of the given UTC timestamp
 *
 * @param time
 * @returns {number}
 */
api.getQuarterNoFromTime = function (time) {
    return getQuarterNoFromTime(time);
};

/**
 * Returns the halfyear number of the given UTC timestamp
 * @param time
 * @returns {number}
 */
api.getHalfyearNoFromTime = function (time) {
    return getHalfyearNoFromTime(time);
};


/**
 * Returns the current date
 *
 * @returns {String}
 */
api.getCurrentDate = function () {
    return moment().format('YYYY-MM-DD');
};


/**
 * Method to define how many of the provided periods are between the dates
 *
 * @param {date|moment} startDate
 * @param {date|moment} endDate
 * @param {PERIOD_MODE} periodMode
 */
api.getPeriodDifference = function (startDate, endDate, periodMode) {
    //Parse input to moment object
    var start = moment(startDate),
        end = moment(endDate);

    //Reduce input to minimum off provided periodMode
    setPeriodToMinimum(start, periodMode);
    setPeriodToMinimum(end, periodMode);

    //Create range
    var range = moment().range(start, end);

    return range.diff(getMomentRangeIterator(periodMode))
};

/**
 * Returns a date matching the period relative to the given offset, whereas
 * the start period is either specified or the current period
 *
 * @param unit
 * @param step
 * @param from
 */
api.getRelativePeriod = function (unit, offset, from, formatString) {
    formatString = formatString || 'YYYY-MM-DD';

    var pos,
        stepVal,
        stepUnit,
        result;

    if (from === undefined) {
        from = api.getCurrentDate();
    }

    pos = moment.utc(from);

    if (offset === 0) {
        return from;
    }
    stepVal = offset;
    switch (unit) {
        case PERIOD_MODES.DAYS:
            stepUnit = 'd';
            break;
        case PERIOD_MODES.WEEKS:
            stepUnit = 'w';
            break;
        case PERIOD_MODES.MONTHS:
            stepUnit = 'M';
            break;
        case PERIOD_MODES.QUARTERS:
            stepUnit = 'Q';
            break;
        case PERIOD_MODES.HALFYEARS:
            stepUnit = 'Q';
            stepVal *= 2;
            break;
        case PERIOD_MODES.YEARS:
            stepUnit = 'y';
            break;
    }

    if (offset > 0) {
        pos = pos.add(stepVal, stepUnit);
    } else {
        pos = pos.subtract(-stepVal, stepUnit);
    }
    result = pos.format('YYYY-MM-DD');
    return result;
};

api.getModes = function (keys) {
    var i,
        iMax,
        key,
        modes;

    modes = {};
    iMax = keys.length;
    for (i = 0; i < iMax; i += 1) {
        key = keys[i];
        if (PERIOD_MODES.hasOwnProperty(key)) {
            modes[key] = PERIOD_MODES[key];
        }
    }
    return modes;
}

api.PERIOD_MODES = PERIOD_MODES;

api.getMomentRangeIterator =getMomentRangeIterator;

//Expose privates for testing
api._getNumberOfDaysInMonth = getNumberOfDaysInMonth;
api._setPeriodOnMoment = setPeriodOnMoment;
api._isNewPeriodGroup = isNewPeriodGroup;
api._setPeriodMinimum = setPeriodToMinimum;
api._setPeriodMaximum = setPeriodToMaximum;
api._expandRangeToCompletePeriods = expandRangeToCompletePeriods;
api._getStringForUtcTimeAndFormat = getStringForUtcTimeAndFormat;

module.exports = api;
