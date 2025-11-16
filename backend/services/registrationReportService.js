import PDFDocument from "pdfkit";
import dayjs from "dayjs";
import { Parser as Json2CsvParser } from "json2csv";
import VehicleModel from "../model/VehicleModel.js";
import { getVehicleStatus } from "../util/plateStatusCalculator.js";
import { getLatestRenewalDate } from "../util/vehicleHelpers.js";

/**
 * This module implements automated daily/monthly/yearly registration reports in PDF and CSV formats,
 * supporting the research objective: “Automate the generation of daily and monthly reports to enable fast,
 * consistent, and accurate reporting without the need for complex models.”
 */
class RegistrationReportService {
  constructor() {
    this.municipalities = [
      "BAGANGA",
      "BANAYBANAY",
      "BOSTON",
      "CARAGA",
      "CATEEL",
      "GOVERNOR GENEROSO",
      "LUPON",
      "MANAY",
      "SAN ISIDRO",
      "TARRAGONA",
      "CITY OF MATI",
    ];
  }

  async generatePdf(filters = {}, context = {}) {
    const payload = await this.buildReportPayload(filters, context);
    const buffer = await this.renderPdf(payload);
    const filename = this.buildFilename("report", payload.meta, "pdf");
    return { buffer, filename, payload };
  }

  async generateCsv(filters = {}, context = {}) {
    const payload = await this.buildReportPayload(filters, context);
    const csv = this.renderCsv(payload);
    const filename = this.buildFilename("data", payload.meta, "csv");
    return { csv, filename, payload };
  }

  async buildReportPayload(filters = {}, context = {}) {
    const normalizedFilters = this.normalizeFilters(filters);
    const {
      scope,
      period,
      startDate,
      endDate,
      municipalityId,
      municipalityLabel,
      vehicleType,
      licenseStatus,
      periodLabel,
    } = normalizedFilters;

    const dateFilter = this.buildRenewalFilter(startDate, endDate);
    const pipeline = [
      ...(dateFilter ? [{ $match: dateFilter }] : []),
      {
        $lookup: {
          from: "owners",
          localField: "driverId",
          foreignField: "_id",
          as: "driverInfo",
        },
      },
      {
        $unwind: {
          path: "$driverInfo",
          preserveNullAndEmptyArrays: false,
        },
      },
    ];

    if (municipalityId !== "all") {
      pipeline.push({
        $match: {
          "driverInfo.address.municipality": {
            $regex: new RegExp(`^${municipalityId}$`, "i"),
          },
        },
      });
    }

    if (vehicleType !== "all") {
      pipeline.push({
        $match: {
          classification: vehicleType.toUpperCase(),
        },
      });
    }

    if (licenseStatus !== "all") {
      pipeline.push({
        $match: {
          "driverInfo.hasDriversLicense": licenseStatus === "with_license",
        },
      });
    }

    pipeline.push({
      $project: {
        plateNo: 1,
        classification: 1,
        dateOfRenewal: 1,
        createdAt: 1,
        vehicleStatusType: 1,
        driverInfo: 1,
      },
    });

    const vehicles = await VehicleModel.aggregate(pipeline);

    const {
      vehiclesSummary,
      driverSummary,
      plateSummary,
      classificationSummary,
      municipalityStats,
      complianceDetails,
      csvRows,
      renewalTimeline,
    } = this.computeCoreMetrics(vehicles, normalizedFilters);

    const trends = this.computeTrends(renewalTimeline);
    const predictive = await this.fetchPredictiveInsights(normalizedFilters);

    const payload = {
      meta: {
        scope,
        periodLabel,
        generatedAt: dayjs().toISOString(),
        generatedBy: context?.user?.name || context?.user?.email || "Automated System",
        municipalityLabel,
        filters: {
          vehicleType,
          licenseStatus,
        },
      },
      kpis: {
        totalRegisteredVehicles: vehiclesSummary.total,
        totalActiveVehicles: vehiclesSummary.active,
        totalExpiredVehicles: vehiclesSummary.expired,
        totalRegisteredOwners: driverSummary.totalDrivers,
        ownersWithLicense: driverSummary.withLicense,
        ownersWithoutLicense: driverSummary.withoutLicense,
        plateCounts: {
          permanent: plateSummary.permanent,
          temporary: plateSummary.temporary,
        },
        vehicleClassification: classificationSummary,
        fleetDiversityLabel: this.getFleetDiversityLabel(classificationSummary),
      },
      trends,
      municipalities: {
        rankings: municipalityStats.rankings,
        topMunicipality: municipalityStats.rankings[0] || null,
        lowestPerformance: municipalityStats.rankings.slice(-3),
      },
      compliance: {
        totalVehicleOwners: driverSummary.totalDrivers,
        overallComplianceRate: complianceDetails.overallComplianceRate,
        topComplianceMunicipality: complianceDetails.topComplianceMunicipality,
        highestNeedArea: complianceDetails.highestNeedArea,
        municipalitiesNeedingAttentionCount:
          complianceDetails.municipalitiesNeedingAttentionCount,
      },
      predictive,
      csvRows,
      notes: [
        "Reports are generated automatically from encoded data and predictive models.",
        "Insights depend on the completeness and accuracy of LTO data submissions.",
      ],
    };

    return payload;
  }

  normalizeFilters(filters) {
    const scope = (filters.scope || "monthly").toLowerCase();
    const periodInput = filters.period;
    let startDate;
    let endDate;
    let periodLabel = "All Time";

    if (scope === "daily" && periodInput) {
      startDate = dayjs(periodInput).startOf("day").toDate();
      endDate = dayjs(periodInput).endOf("day").toDate();
      periodLabel = dayjs(periodInput).format("MMMM D, YYYY");
    } else if (scope === "monthly" && periodInput) {
      startDate = dayjs(periodInput).startOf("month").toDate();
      endDate = dayjs(periodInput).endOf("month").toDate();
      periodLabel = dayjs(periodInput).format("MMMM YYYY");
    } else if (scope === "yearly" && periodInput) {
      startDate = dayjs(periodInput).startOf("year").toDate();
      endDate = dayjs(periodInput).endOf("year").toDate();
      periodLabel = dayjs(periodInput).format("YYYY");
    }

    const municipalityId = filters.municipalityId
      ? filters.municipalityId.toUpperCase()
      : "ALL";
    const municipalityLabel =
      municipalityId === "ALL"
        ? "All Municipalities"
        : this.toTitleCase(municipalityId);

    return {
      scope,
      period: periodInput || null,
      periodLabel,
      startDate,
      endDate,
      municipalityId: municipalityId === "" ? "ALL" : municipalityId,
      municipalityLabel,
      vehicleType: (filters.vehicleType || "all").toLowerCase(),
      licenseStatus: (filters.licenseStatus || "all").toLowerCase(),
    };
  }

  buildRenewalFilter(startDate, endDate) {
    if (!startDate && !endDate) return null;

    const conds = [];
    if (startDate) {
      conds.push({
        $gte: [
          {
            $cond: [
              { $ne: ["$$renewal.date", null] },
              "$$renewal.date",
              "$$renewal",
            ],
          },
          startDate,
        ],
      });
    }
    if (endDate) {
      conds.push({
        $lte: [
          {
            $cond: [
              { $ne: ["$$renewal.date", null] },
              "$$renewal.date",
              "$$renewal",
            ],
          },
          endDate,
        ],
      });
    }

    const condition =
      conds.length > 1
        ? { $and: conds }
        : conds.length === 1
          ? conds[0]
          : { $ne: ["$$renewal", null] };

    return {
      $expr: {
        $gt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ["$dateOfRenewal", []] },
                as: "renewal",
                cond: condition,
              },
            },
          },
          0,
        ],
      },
    };
  }

  computeCoreMetrics(vehicles, filters) {
    const vehicleStatusCounts = { total: 0, active: 0, expired: 0 };
    const driverMap = new Map();
    const plateSummary = { permanent: 0, temporary: 0 };
    const classificationSummary = { PRIVATE: 0, "FOR HIRE": 0, GOVERNMENT: 0 };
    const municipalityMap = new Map();
    const renewalTimeline = [];

    vehicles.forEach((vehicle) => {
      vehicleStatusCounts.total += 1;
      const latestRenewal = getLatestRenewalDate(vehicle.dateOfRenewal);
      if (latestRenewal) {
        renewalTimeline.push({
          date: dayjs(latestRenewal),
          vehicle,
        });
      }
      const status = getVehicleStatus(
        vehicle.plateNo,
        latestRenewal,
        vehicle.vehicleStatusType || "Old",
      );
      if (status === "1") {
        vehicleStatusCounts.active += 1;
      } else {
        vehicleStatusCounts.expired += 1;
      }

      if (/[A-Za-z]/.test(vehicle.plateNo || "")) {
        plateSummary.permanent += 1;
      } else {
        plateSummary.temporary += 1;
      }

      const classification = (vehicle.classification || "PRIVATE").toUpperCase();
      if (classificationSummary[classification] === undefined) {
        classificationSummary[classification] = 0;
      }
      classificationSummary[classification] += 1;

      const driverId = vehicle.driverInfo?._id?.toString();
      if (driverId) {
        if (!driverMap.has(driverId)) {
          driverMap.set(driverId, {
            hasLicense: !!vehicle.driverInfo.hasDriversLicense,
            municipality:
              vehicle.driverInfo.address?.municipality?.toUpperCase() || "UNKNOWN",
          });
        }
      }

      const municipalityName =
        vehicle.driverInfo.address?.municipality?.toUpperCase() ||
        "UNSPECIFIED";
      if (!municipalityMap.has(municipalityName)) {
        municipalityMap.set(municipalityName, {
          municipalityName: this.toTitleCase(municipalityName),
          totalVehicles: 0,
          activeVehicles: 0,
          expiredVehicles: 0,
          ownersWithLicense: new Set(),
          ownersWithoutLicense: new Set(),
          privateVehicles: 0,
          forHireVehicles: 0,
          governmentVehicles: 0,
          platePermanent: 0,
          plateTemporary: 0,
        });
      }

      const muniStats = municipalityMap.get(municipalityName);
      muniStats.totalVehicles += 1;
      if (status === "1") {
        muniStats.activeVehicles += 1;
      } else {
        muniStats.expiredVehicles += 1;
      }

      const ownerSet = vehicle.driverInfo.hasDriversLicense
        ? muniStats.ownersWithLicense
        : muniStats.ownersWithoutLicense;
      if (driverId) {
        ownerSet.add(driverId);
      }

      if (/[A-Za-z]/.test(vehicle.plateNo || "")) {
        muniStats.platePermanent += 1;
      } else {
        muniStats.plateTemporary += 1;
      }

      if (classification === "PRIVATE") {
        muniStats.privateVehicles += 1;
      } else if (classification === "FOR HIRE") {
        muniStats.forHireVehicles += 1;
      } else if (classification === "GOVERNMENT") {
        muniStats.governmentVehicles += 1;
      }
    });

    const driverSummary = {
      totalDrivers: driverMap.size,
      withLicense: [...driverMap.values()].filter((d) => d.hasLicense).length,
      withoutLicense: [...driverMap.values()].filter((d) => !d.hasLicense).length,
    };

    const municipalityRankings = [...municipalityMap.values()]
      .map((muni) => {
        const ownersWithLicense = muni.ownersWithLicense.size;
        const ownersWithoutLicense = muni.ownersWithoutLicense.size;
        const totalOwners = ownersWithLicense + ownersWithoutLicense;
        const complianceRate =
          totalOwners > 0 ? (ownersWithLicense / totalOwners) * 100 : 0;
        return {
          municipalityName: muni.municipalityName,
          totalVehicles: muni.totalVehicles,
          activeVehicles: muni.activeVehicles,
          ownersWithLicense,
          ownersWithoutLicense,
          complianceRate: Number(complianceRate.toFixed(2)),
          privateVehicles: muni.privateVehicles,
          forHireVehicles: muni.forHireVehicles,
          governmentVehicles: muni.governmentVehicles,
          platePermanent: muni.platePermanent,
          plateTemporary: muni.plateTemporary,
        };
      })
      .sort((a, b) => b.totalVehicles - a.totalVehicles);

    const complianceDetails = this.computeComplianceDetails(municipalityRankings);

    const csvRows = this.buildCsvRows({
      rankings: municipalityRankings,
      filters,
      predictive: null,
    });

    return {
      vehiclesSummary: vehicleStatusCounts,
      driverSummary,
      plateSummary,
      classificationSummary: {
        private: classificationSummary.PRIVATE || 0,
        forHire: classificationSummary["FOR HIRE"] || 0,
        government: classificationSummary.GOVERNMENT || 0,
      },
      municipalityStats: {
        rankings: municipalityRankings,
      },
      complianceDetails,
      csvRows,
      renewalTimeline,
    };
  }

  computeTrends(renewalTimeline) {
    const yearlyMap = new Map();
    const monthlyMap = new Map();

    renewalTimeline.forEach(({ date }) => {
      if (!date?.isValid?.() || !date.isValid()) return;
      const year = date.year();
      const monthKey = date.format("MMM YYYY");

      yearlyMap.set(year, (yearlyMap.get(year) || 0) + 1);
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
    });

    const yearly = [...yearlyMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year: Number(year), activeVehicles: count }));

    const monthly = [...monthlyMap.entries()]
      .sort(
        (a, b) =>
          dayjs(a[0], "MMM YYYY").toDate() - dayjs(b[0], "MMM YYYY").toDate(),
      )
      .map(([label, count]) => ({ monthLabel: label, activeVehicles: count }));

    const avgYearlyGrowthRate = this.calculateAverageGrowthRate(yearly);
    const avgMonthlyGrowthRate = this.calculateAverageGrowthRate(monthly);
    const peakYear =
      yearly.length > 0
        ? yearly.reduce(
            (max, entry) =>
              entry.activeVehicles > (max?.value || 0)
                ? { year: entry.year, value: entry.activeVehicles }
                : max,
            null,
          )
        : null;
    const peakMonth =
      monthly.length > 0
        ? monthly.reduce(
            (max, entry) =>
              entry.activeVehicles > (max?.value || 0)
                ? { monthLabel: entry.monthLabel, value: entry.activeVehicles }
                : max,
            null,
          )
        : null;
    const monthlyAverage =
      monthly.length > 0
        ? Math.round(
            monthly.reduce((sum, entry) => sum + entry.activeVehicles, 0) /
              monthly.length,
          )
        : null;
    const trendDirectionLabel = this.getTrendDirectionLabel(monthly);

    return {
      yearly,
      monthly,
      avgYearlyGrowthRate,
      avgMonthlyGrowthRate,
      peakYear,
      peakMonth,
      monthlyAverage,
      trendDirectionLabel,
    };
  }

  async fetchPredictiveInsights(filters) {
    if (typeof fetch === "undefined") {
      console.warn("Fetch API unavailable; skipping predictive analytics.");
      return null;
    }
    const baseUrl =
      process.env.MV_PREDICTION_API_URL || "http://localhost:5002";
    try {
      const url = new URL("/api/predict/registrations", baseUrl);
      url.searchParams.set("weeks", "52");
      if (filters.municipalityId !== "ALL") {
        url.searchParams.set("municipality", filters.municipalityId);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      if (!data.success || !data.data?.weekly_predictions) {
        return null;
      }

      const weekly = data.data.weekly_predictions;
      const monthlyMap = new Map();
      weekly.forEach((prediction) => {
        const date = dayjs(prediction.date || prediction.week_start);
        const monthLabel = date.format("MMM YYYY");
        monthlyMap.set(
          monthLabel,
          (monthlyMap.get(monthLabel) || 0) +
            (prediction.predicted_count ||
              prediction.predicted ||
              prediction.total_predicted ||
              0),
        );
      });

      const monthly = [...monthlyMap.entries()].map(([monthLabel, value]) => ({
        monthLabel,
        value: Math.round(value),
      }));
      monthly.sort(
        (a, b) =>
          dayjs(a.monthLabel, "MMM YYYY").toDate() -
          dayjs(b.monthLabel, "MMM YYYY").toDate(),
      );

      const totalPredicted = monthly.reduce((sum, m) => sum + m.value, 0);
      const trendDirectionLabel = this.getTrendDirectionLabel(monthly);
      const trendDirectionChangePercent = this.calculateTrendDelta(monthly);
      const peakMonth =
        monthly.length > 0
          ? monthly.reduce(
              (max, entry) =>
                entry.value > (max?.value || 0) ? entry : max,
              null,
            )
          : null;
      const volatilityPercent = this.calculateVolatility(monthly);

      let caravanPriorityMunicipalities = [];
      if (filters.municipalityId === "ALL") {
        caravanPriorityMunicipalities = await this.fetchCaravanPriorityList();
      }

      const recommendations = this.generateRecommendations({
        totalPredicted,
        trendDirectionLabel,
        trendDirectionChangePercent,
        volatilityPercent,
        peakMonth,
        caravanPriorityMunicipalities,
      });

      return {
        totalPredicted,
        trendDirectionLabel,
        trendDirectionChangePercent,
        peakMonth,
        volatilityPercent,
        caravanPriorityMunicipalities,
        recommendations,
      };
    } catch (error) {
      console.warn("Predictive analytics unavailable:", error.message);
      return null;
    }
  }

  async fetchCaravanPriorityList() {
    if (typeof fetch === "undefined") {
      return [];
    }
    const baseUrl =
      process.env.MV_PREDICTION_API_URL || "http://localhost:5002";
    const promises = this.municipalities.map(async (municipality) => {
      try {
        const url = new URL("/api/predict/registrations", baseUrl);
        url.searchParams.set("weeks", "12");
        url.searchParams.set("municipality", municipality);
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        if (!data.success || !data.data?.weekly_predictions) return null;
        const total = data.data.weekly_predictions.reduce(
          (sum, entry) =>
            sum +
            (entry.predicted_count ||
              entry.predicted ||
              entry.total_predicted ||
              0),
          0,
        );
        return { municipalityName: this.toTitleCase(municipality), total };
      } catch (err) {
        return null;
      }
    });

    const results = (await Promise.all(promises)).filter(Boolean);
    return results
      .sort((a, b) => a.total - b.total)
      .map((entry, index) => ({
        municipalityName: entry.municipalityName,
        predictedRegistrations: Math.round(entry.total),
        rank: index + 1,
      }));
  }

  buildCsvRows({ rankings, filters, predictive }) {
    const periodLabel = filters.periodLabel;
    const scope = filters.scope;
    const caravanRankMap = new Map();
    predictive?.caravanPriorityMunicipalities?.forEach((entry) => {
      caravanRankMap.set(entry.municipalityName, entry.rank);
    });

    return rankings.map((municipality) => {
      const totalOwners =
        municipality.ownersWithLicense + municipality.ownersWithoutLicense;
      return {
        period_scope: scope,
        period_label: periodLabel,
        municipality_name: municipality.municipalityName,
        total_registrations: municipality.totalVehicles,
        active_registrations: municipality.activeVehicles,
        expired_registrations:
          municipality.totalVehicles - municipality.activeVehicles,
        owners_with_license: municipality.ownersWithLicense,
        owners_without_license: municipality.ownersWithoutLicense,
        private_vehicles: municipality.privateVehicles,
        for_hire_vehicles: municipality.forHireVehicles,
        government_vehicles: municipality.governmentVehicles,
        plate_permanent: municipality.platePermanent,
        plate_temporary: municipality.plateTemporary,
        overall_compliance_rate: municipality.complianceRate,
        predicted_registrations: "",
        is_peak_month: false,
        caravan_priority_rank:
          caravanRankMap.get(municipality.municipalityName) || "",
        notes:
          totalOwners > 0 && municipality.complianceRate < 50
            ? "Below 50% compliance"
            : "",
      };
    });
  }

  renderPdf(payload) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const buffers = [];
        doc.on("data", (data) => buffers.push(data));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        this.drawPdfHeader(doc, payload);
        this.drawKpiSection(doc, payload.kpis);
        this.drawTrendsSection(doc, payload.trends, payload.meta);
        this.drawMunicipalitySection(doc, payload.municipalities);
        this.drawComplianceSection(doc, payload.compliance);
        if (payload.predictive) {
          this.drawPredictiveSection(doc, payload.predictive);
        }
        this.drawNotesSection(doc, payload.notes);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  renderCsv(payload) {
    const parser = new Json2CsvParser({
      fields: [
        "period_scope",
        "period_label",
        "municipality_name",
        "total_registrations",
        "active_registrations",
        "expired_registrations",
        "owners_with_license",
        "owners_without_license",
        "private_vehicles",
        "for_hire_vehicles",
        "government_vehicles",
        "plate_permanent",
        "plate_temporary",
        "overall_compliance_rate",
        "predicted_registrations",
        "is_peak_month",
        "caravan_priority_rank",
        "notes",
      ],
    });
    return parser.parse(payload.csvRows || []);
  }

  drawPdfHeader(doc, payload) {
    doc
      .fontSize(10)
      .fillColor("#444")
      .text("Land Transportation Office – Davao Oriental", { align: "left" })
      .text("LTO Data Management & Analytics System", { align: "left" })
      .moveDown(0.5);

    const titleMap = {
      daily: "Daily Vehicle Registration Report",
      monthly: "Monthly Vehicle Registration Report",
      yearly: "Yearly Vehicle Registration Report",
    };
    doc
      .fontSize(18)
      .fillColor("#000")
      .text(titleMap[payload.meta.scope] || "Vehicle Registration Report", {
        align: "left",
      })
      .moveDown(0.2)
      .fontSize(12)
      .text(`Period: ${payload.meta.periodLabel}`)
      .text(`Municipality: ${payload.meta.municipalityLabel}`)
      .text(
        `Filters: Vehicle Type - ${this.toTitleCase(payload.meta.filters.vehicleType)}, License Status - ${this.toTitleCase(payload.meta.filters.licenseStatus)}`,
      )
      .text(
        `Generated on: ${dayjs(payload.meta.generatedAt).format("MMMM D, YYYY h:mm A")}`,
      )
      .text(`Generated by: ${payload.meta.generatedBy}`)
      .moveDown(1);
  }

  drawKpiSection(doc, kpis) {
    doc.fontSize(14).fillColor("#111").text("Section 1 – Key Performance Indicators");
    doc.moveDown(0.5).fontSize(11).fillColor("#000");
    const kpiRows = [
      [
        `Total Registered Vehicles: ${kpis.totalRegisteredVehicles.toLocaleString()}`,
        `Active Vehicles: ${kpis.totalActiveVehicles.toLocaleString()}`,
        `Expired Vehicles: ${kpis.totalExpiredVehicles.toLocaleString()}`,
      ],
      [
        `Total Registered Owners: ${kpis.totalRegisteredOwners.toLocaleString()}`,
        `Owners w/ License: ${kpis.ownersWithLicense.toLocaleString()}`,
        `Owners without License: ${kpis.ownersWithoutLicense.toLocaleString()}`,
      ],
      [
        `Plate Classification – Permanent: ${kpis.plateCounts.permanent.toLocaleString()}`,
        `Plate Classification – Temporary: ${kpis.plateCounts.temporary.toLocaleString()}`,
        `Fleet Diversity: ${kpis.fleetDiversityLabel}`,
      ],
      [
        `Vehicle Classification – Private: ${kpis.vehicleClassification.private.toLocaleString()}`,
        `For Hire: ${kpis.vehicleClassification.forHire.toLocaleString()}`,
        `Government: ${kpis.vehicleClassification.government.toLocaleString()}`,
      ],
    ];
    kpiRows.forEach((row) => {
      doc
        .fontSize(10)
        .text(row[0], { continued: true, width: 180 })
        .text(row[1], { continued: true, width: 180 })
        .text(row[2], { width: 180 })
        .moveDown(0.2);
    });
    doc.moveDown(1);
  }

  drawTrendsSection(doc, trends, meta) {
    doc.fontSize(14).fillColor("#111").text("Section 2 – Registration Trends");
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .text(
        `Scope: ${this.toTitleCase(meta.scope)} | Municipality: ${meta.municipalityLabel}`,
      );
    doc.moveDown(0.5);
    if (trends.yearly?.length) {
      doc.fontSize(11).text("Yearly Performance (Last Periods)");
      doc.fontSize(9);
      trends.yearly.forEach((entry) => {
        doc.text(`• ${entry.year}: ${entry.activeVehicles.toLocaleString()} vehicles`);
      });
      doc.moveDown(0.3);
      doc.text(
        `Average Yearly Growth Rate: ${trends.avgYearlyGrowthRate ?? 0}% | Peak Year: ${trends.peakYear ? `${trends.peakYear.year} (${trends.peakYear.value.toLocaleString()})` : "N/A"}`,
      );
    }
    doc.moveDown(0.5);
    if (trends.monthly?.length) {
      doc.fontSize(11).text("Monthly Performance (Current Year Range)");
      doc.fontSize(9);
      trends.monthly.forEach((entry) => {
        doc.text(
          `• ${entry.monthLabel}: ${entry.activeVehicles.toLocaleString()} vehicles`,
        );
      });
      doc.moveDown(0.3);
      doc.text(
        `Monthly Average: ${trends.monthlyAverage?.toLocaleString() || 0} | Peak Month: ${trends.peakMonth ? `${trends.peakMonth.monthLabel} (${trends.peakMonth.value.toLocaleString()})` : "N/A"} | Trend: ${trends.trendDirectionLabel}`,
      );
    }
    doc.moveDown(1);
  }

  drawMunicipalitySection(doc, municipalities) {
    doc.fontSize(14).fillColor("#111").text("Section 3 – Municipal Performance");
    doc.moveDown(0.3);
    doc.fontSize(10).text("Rank | Municipality | Total Vehicles | Active Vehicles | Compliance");
    doc.moveDown(0.2);
    municipalities.rankings.slice(0, 15).forEach((entry, index) => {
      doc.text(
        `${index + 1}. ${entry.municipalityName} — ${entry.totalVehicles.toLocaleString()} total / ${entry.activeVehicles.toLocaleString()} active / ${entry.complianceRate}% compliance`,
      );
    });
    doc.moveDown(0.4);
    doc.fontSize(10).text("Lowest Performing Municipalities:");
    municipalities.lowestPerformance.forEach((entry) => {
      doc.text(
        `• ${entry.municipalityName}: ${entry.totalVehicles.toLocaleString()} vehicles, ${entry.complianceRate}% compliance`,
      );
    });
    doc.moveDown(1);
  }

  drawComplianceSection(doc, compliance) {
    doc.fontSize(14).fillColor("#111").text("Section 4 – License Compliance");
    doc.moveDown(0.4);
    doc.fontSize(10).text(
      `Total Vehicle Owners: ${compliance.totalVehicleOwners.toLocaleString()}`,
    );
    doc.text(
      `Overall Compliance Rate: ${compliance.overallComplianceRate.toFixed(2)}%`,
    );
    if (compliance.topComplianceMunicipality) {
      doc.text(
        `Top Compliance Municipality: ${compliance.topComplianceMunicipality.name} (${compliance.topComplianceMunicipality.complianceRate.toFixed(2)}%)`,
      );
    }
    if (compliance.highestNeedArea) {
      doc.text(
        `Highest Need Area: ${compliance.highestNeedArea.name} (${compliance.highestNeedArea.withoutLicenseRate.toFixed(2)}% without license)`,
      );
    }
    doc.text(
      `Municipalities Needing Attention (<50% compliance): ${compliance.municipalitiesNeedingAttentionCount}`,
    );
    doc.moveDown(1);
  }

  drawPredictiveSection(doc, predictive) {
    doc
      .fontSize(14)
      .fillColor("#111")
      .text("Section 5 – Predictive Analytics Overview");
    doc.moveDown(0.4);
    doc.fontSize(10).text(
      `Total Predicted Registrations (Upcoming Horizon): ${predictive.totalPredicted.toLocaleString()}`,
    );
    doc.text(
      `Trend Direction: ${predictive.trendDirectionLabel} (${predictive.trendDirectionChangePercent.toFixed(2)}%)`,
    );
    if (predictive.peakMonth) {
      doc.text(
        `Peak Month Forecast: ${predictive.peakMonth.monthLabel} (${predictive.peakMonth.value.toLocaleString()} vehicles)`,
      );
    }
    doc.text(`Volatility: ${predictive.volatilityPercent.toFixed(2)}%`);
    if (predictive.caravanPriorityMunicipalities?.length) {
      doc.moveDown(0.2).text("Caravan Priority Municipalities:");
      predictive.caravanPriorityMunicipalities.slice(0, 5).forEach((entry) => {
        doc.text(
          `• ${entry.rank}. ${entry.municipalityName} – ${entry.predictedRegistrations.toLocaleString()} projected registrations`,
        );
      });
    }
    if (predictive.recommendations?.length) {
      doc.moveDown(0.2).text("Recommendations:");
      predictive.recommendations.forEach((rec) => {
        doc.text(`• [${rec.priority.toUpperCase()}] ${rec.title} – ${rec.description}`);
      });
    }
    doc.moveDown(1);
  }

  drawNotesSection(doc, notes) {
    doc.fontSize(14).fillColor("#111").text("Section 6 – Notes and Disclaimers");
    doc.moveDown(0.3);
    doc.fontSize(10);
    notes.forEach((note) => doc.text(`• ${note}`));
    doc.moveDown(0.5);
    doc.text(
      "Automated report generated by LTO Data Management & Analytics System. No manual computation required.",
    );
  }

  computeComplianceDetails(municipalityRankings) {
    if (!municipalityRankings.length) {
      return {
        overallComplianceRate: 0,
        topComplianceMunicipality: null,
        highestNeedArea: null,
        municipalitiesNeedingAttentionCount: 0,
      };
    }

    const totals = municipalityRankings.reduce(
      (summary, entry) => {
        summary.withLicense += entry.ownersWithLicense;
        summary.total += entry.ownersWithLicense + entry.ownersWithoutLicense;
        if (
          !summary.top ||
          entry.complianceRate > summary.top.complianceRate
        ) {
          summary.top = {
            name: entry.municipalityName,
            complianceRate: entry.complianceRate,
          };
        }
        const withoutRate = 100 - entry.complianceRate;
        if (!summary.need || withoutRate > summary.need.withoutLicenseRate) {
          summary.need = {
            name: entry.municipalityName,
            withoutLicenseRate: withoutRate,
          };
        }
        if (entry.complianceRate < 50) {
          summary.lowCount += 1;
        }
        return summary;
      },
      {
        withLicense: 0,
        total: 0,
        top: null,
        need: null,
        lowCount: 0,
      },
    );

    const overallComplianceRate =
      totals.total > 0 ? (totals.withLicense / totals.total) * 100 : 0;

    return {
      overallComplianceRate,
      topComplianceMunicipality: totals.top,
      highestNeedArea: totals.need,
      municipalitiesNeedingAttentionCount: totals.lowCount,
    };
  }

  calculateAverageGrowthRate(series) {
    if (!series || series.length < 2) return null;
    const growthRates = [];
    for (let i = 1; i < series.length; i++) {
      const previous = series[i - 1].activeVehicles;
      const current = series[i].activeVehicles;
      if (previous > 0) {
        growthRates.push(((current - previous) / previous) * 100);
      }
    }
    if (!growthRates.length) return null;
    const avg =
      growthRates.reduce((sum, value) => sum + value, 0) / growthRates.length;
    return Number(avg.toFixed(2));
  }

  getTrendDirectionLabel(series) {
    if (!series || series.length < 2) return "Stable";
    const first = series[0].value ?? series[0].activeVehicles;
    const last = series[series.length - 1].value ?? series[series.length - 1].activeVehicles;
    if (!first && !last) return "Stable";
    const change = first ? ((last - first) / first) * 100 : 100;
    if (change > 5) return "Increasing";
    if (change < -5) return "Decreasing";
    return "Stable";
  }

  calculateTrendDelta(series) {
    if (!series || series.length < 2) return 0;
    const first = series[0].value ?? series[0].activeVehicles;
    const last = series[series.length - 1].value ?? series[series.length - 1].activeVehicles;
    if (!first) return 0;
    return Number((((last - first) / first) * 100).toFixed(2));
  }

  calculateVolatility(series) {
    if (!series || !series.length) return 0;
    const values = series.map((entry) => entry.value ?? entry.activeVehicles);
    const mean =
      values.reduce((sum, value) => sum + value, 0) / values.length || 0;
    if (!mean) return 0;
    const variance =
      values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
      values.length;
    return Number(((Math.sqrt(variance) / mean) * 100).toFixed(2));
  }

  generateRecommendations(metrics) {
    const recommendations = [];
    if (metrics.trendDirectionLabel === "Decreasing") {
      recommendations.push({
        title: "Investigate Declining Trend",
        priority: "high",
        category: "Risk Mitigation",
        description:
          "Registrations show a downward trend. Coordinate with LGUs to identify bottlenecks and launch awareness campaigns.",
      });
    } else if (metrics.trendDirectionLabel === "Increasing") {
      recommendations.push({
        title: "Scale Resources for Growth",
        priority: "medium",
        category: "Operational Planning",
        description:
          "Allocate additional staff or extend office hours to accommodate growing demand.",
      });
    }

    if (metrics.volatilityPercent > 25) {
      recommendations.push({
        title: "Prepare Flexible Staffing",
        priority: "high",
        category: "Volatility Management",
        description:
          "High forecast volatility detected. Maintain reserve teams for sudden surges in registrations.",
      });
    }

    if (metrics.caravanPriorityMunicipalities?.length) {
      recommendations.push({
        title: "Deploy Caravans to Low-Volume Areas",
        priority: "high",
        category: "Service Delivery",
        description:
          "Schedule mobile registration caravans for municipalities with the lowest projected registrations to improve equity.",
      });
    }

    return recommendations;
  }

  getFleetDiversityLabel(classificationSummary) {
    const values = Object.values(classificationSummary).filter((value) => value > 0);
    if (values.length >= 3) return "High";
    if (values.length === 2) return "Moderate";
    return "Low";
  }

  buildFilename(prefix, meta, extension) {
    const slug = meta.periodLabel.toLowerCase().replace(/\s+/g, "-");
    return `registration-${prefix}-${meta.scope}-${slug}.${extension}`;
  }

  toTitleCase(value) {
    if (!value) return "All";
    return value
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}

export default RegistrationReportService;

