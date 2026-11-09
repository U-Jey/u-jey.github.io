/** Permet de calculer le niveau et les PVs à retirer au boss de guilde en fonction d'un score. */
var originGuildBossCalculator = (function() {
    "use strict";

    let _module = {};

    // Les données ci-dessous proviennent de ce site fantastique : https://7dsorigin.app/fr/boss-de-confrerie/akumu-bete-demoniaque
    // Merci à elles / eux !
    let _guildBossLevelsPerVersion = {
        "PRE_2.3": [
            { level: 1, health: 2090121 },
            { level: 2, health: 2923402 },
            { level: 3, health: 3974208 },
            { level: 4, health: 5180389 },
            { level: 5, health: 6541945 },
            { level: 6, health: 8198714 },
            { level: 7, health: 10197308 },
            { level: 8, health: 12413428 },
            { level: 9, health: 14847073 },
            { level: 10, health: 17700232 },

            { level: 11, health: 24022303 },
            { level: 12, health: 28721553 },
            { level: 13, health: 34135530 },
            { level: 14, health: 40334151 },
            { level: 15, health: 47387335 },
            { level: 16, health: 54999870 },
            { level: 17, health: 63560194 },
            { level: 18, health: 73549970 },
            { level: 19, health: 84238935 },
            { level: 20, health: 96543801 },

            { level: 21, health: 102375267 },
            { level: 22, health: 112611620 },
            { level: 23, health: 123127648 },
            { level: 24, health: 134412784 },
            { level: 25, health: 146490333 },
            { level: 26, health: 158878632 },
            { level: 27, health: 172090420 },
            { level: 28, health: 185628496 },
            { level: 29, health: 200021136 },
            { level: 30, health: 214755600 },
        ],

        "2.3": [
            { level: 1, health: 2090121 },
            { level: 2, health: 2926169 },
            { level: 3, health: 4017631 },
            { level: 4, health: 5415766 },
            { level: 5, health: 7170474 },
            { level: 6, health: 9335957 },
            { level: 7, health: 11968697 },
            { level: 8, health: 15116465 },
            { level: 9, health: 18819999 },
            { level: 10, health: 23110958 },

            { level: 11, health: 23110958 },
            { level: 12, health: 33584244 },
            { level: 13, health: 39797329 },
            { level: 14, health: 46642470 },
            { level: 15, health: 54151907 },
            { level: 16, health: 62274693 },
            { level: 17, health: 70993151 },
            { level: 18, health: 80222260 },
            { level: 19, health: 89929154 },
            { level: 20, health: 100091148 },

            { level: 21, health: 144131253 },
            { level: 22, health: 204666379 },
            { level: 23, health: 286532931 },
            { level: 24, health: 395415445 },
            { level: 25, health: 537765005 },
            { level: 26, health: 720605106 },
            { level: 27, health: 951198740 },
            { level: 28, health: 1236558362 },
            { level: 29, health: 1582794704 },
            { level: 30, health: 1994321327 },
        ]
    };

    // À partir de la 2.3...
    let _guildBossLevels = _guildBossLevelsPerVersion["2.3"];

    let _scoreFactor = 10000, // (: ils se sont pas trop cassés la tête, et ça fait plaisir)
        _minScore = 0,
        _maxTheoreticalScore = null; // (: on le calcule désormais dans la méthode "computeBossLevelData")

    let _$scoreInput = null,
        _$levelSpan = null,
        _$limitBreakSup = null,
        _$currentHealthBlock = null,
        _$currentHealthSpan = null,
        _$targetScoreButtons = null;

    /** Prépare les données nécessaire au fonctionnement du moteur de calcul. */
    function computeBossLevelData() {
        let totalHealth = 0;

        // On commence par calculer le cumul des PV par niveau...
        $.each(_guildBossLevels, function(i, level) {
            totalHealth += level.health;
            level.totalHealth = totalHealth;
        });

        // ... Pour déterminer ensuite le score maximal théorique.
        _maxTheoreticalScore = Math.trunc(Math.max.apply(Math, _guildBossLevels.map(l => l.totalHealth)) / _scoreFactor);
    }

    /** Initialise les membres internes. */
    function initMembers() {
        _$scoreInput = $("#scoreInput");
        _$levelSpan = $(".bdg-level");
        _$limitBreakSup = $(".bdg-limit-break");
        _$currentHealthBlock = $(".bdg-health-current-level");
        _$currentHealthSpan = $(".bdg-health-current-percentage");
        _$targetScoreButtons = $(".btn-target-score");

        // On n'oublie pas de mettre à jour le score maximum théorique dans le bouton concerné.
        _$targetScoreButtons.filter((i, b) => $(b).is(".maximum")).attr("data-target-score", _maxTheoreticalScore);
    }

    /** Associe les handlers aux événements des membres du module. */
    function bindEvents() {
        _$scoreInput.off("change input").on("change input", function () {
            // On récupère la valeur saisie, et on s'assure d'avoir un score compris dans la plage théorique de points du boss.
            let score = parseInt(_$scoreInput.val());
            score = isNaN(score)
                ? 0
                : score < _minScore 
                    ? _minScore 
                    : score;

            // On met à jour le champ avec la valeur corrigée.
            _$scoreInput.val(score);

            // On prépare une variable locale pour travailler sur le score réel sans l'affecter (au cas où celui-ci dépasserait le score maximal théorique).
            let workingScore = score,
                limitBreak = 0;

            // Si on dépasse le score maximal théorique, on boucle indéfiniment sur le dernier niveau :
            // - on doit donc déterminer l'itération actuelle de ce niveau (limitBreak) ;
            // - et on ramène le score à un niveau équivalent à sa progression dans les limites théoriques (workingScore).
            if (score > _maxTheoreticalScore) {
                // Pour commencer, on détermine le montant du score qui sort des limites.
                // Ensuite, on calcule le nombre de dégâts que cet excédent représente et on le divise par les PV du niveau maximal.
                let maxLevel = _guildBossLevels.slice(-1)[0],
                    limitBreakScore = score - _maxTheoreticalScore,
                    limitBreakDivisionResult = limitBreakScore * _scoreFactor / maxLevel.health;

                // L'itération actuelle du dernier niveau est déterminée par la partie entière du résultat de la division.
                limitBreak = 1 + Math.trunc(limitBreakDivisionResult);

                // Le score de travail, donc dans les limites théoriques, est calculable à l'aide du reste de la division.
                workingScore = _maxTheoreticalScore - Math.trunc((1 - limitBreakDivisionResult % 1) * maxLevel.health / _scoreFactor);
            }

            // On applique le calcul de con.
            let targetDamage = workingScore * _scoreFactor,
                targetLevel = _guildBossLevels.filter(l => l.totalHealth > targetDamage)[0],
                targetRemainingHealth = targetLevel.totalHealth - targetDamage,
                targetRemainingHealthPercentage = targetRemainingHealth * 100 / targetLevel.health;

            // On met à jour les éléments visuels de l'écran.
            _$levelSpan.text(targetLevel.level);
            _$limitBreakSup.attr("data-limit-break", limitBreak);
            _$currentHealthBlock.css("width", `${targetRemainingHealthPercentage}%`);
            _$currentHealthSpan.text(`${targetRemainingHealthPercentage.toFixed(2)}`);
        });

        _$targetScoreButtons.off("click").on("click", function () {
            // Ici, on récupère le score à appliquer et on déclenche l'événement "change" de l'input.
            _$scoreInput.val($(this).attr("data-target-score"));
            _$scoreInput.trigger("change");
        });
    }

    /** Remplit le tableau des points minimum par niveau. */
    function buildCheatSheet() {
        // On récupère le template des lignes via une requête AJAX.
        $.ajax({
            url: "./template.html",
            method: "GET",
            success: function (html) {
                // On prépare les niveaux sur lesquels itérer.
                // Le cumul de PV d'un niveau représente les dégâts à infliger pour aller au niveau suivant, c'est pour ça qu'on s'arrête au niveau 19 ici.
                let sheetLevels = _guildBossLevels.slice(0, -1),
                    maxLevel = _guildBossLevels.slice(-1)[0],
                    // On définit également les objectifs hebdomadaires pour toucher les 10 000 points.
                    weeklyGoals = [
                        { score: 10000, class: "gold" },
                        { score: 5000, class: "silver" },
                        { score: 3333, class: "bronze" },
                    ];

                // On ajoute ensuite les bordures min. et max. pour entourer les scores par niveau.
                sheetLevels.unshift({ label: "1", totalHealth: 0 });

                for (let level of sheetLevels) {
                    // On prépare la ligne à ajouter, et on calcule le score minimum pour le niveau.
                    let levelHtml = $(html),
                        levelScore = level.totalHealth / _scoreFactor;

                    // On met à jour les éléments de la ligne.
                    levelHtml.find(".bdg-level").text(level.label ?? level.level + 1);
                    levelHtml.find(".bdg-score").text(levelScore.toFixed(0));
                    levelHtml.find(".bdg-health-current-level").css("width", `${level.totalHealth * 100 / maxLevel.totalHealth}%`);

                    // Ensuite, on regarde si le dernier objectif hebdomadaire a été atteint.
                    let goal = weeklyGoals.length > 0 ? weeklyGoals.slice(-1)[0] : null;
                    if (goal && levelScore > goal.score) {
                        // Si c'est le cas, on le retire du tableau et on applique une classe particulière pour identifier plus facilement le niveau minimum à atteindre.
                        weeklyGoals.pop();
                        levelHtml.addClass(goal.class);
                    }

                    // On ajoute ensuite l'élément EN HAUT du tableau (tri descendant).
                    $(".bdg-milestones").prepend(levelHtml);
                }
            }
        });
    }

    /** Initialise le module JS. */
    _module.init = function() {
        computeBossLevelData();

        initMembers();
        bindEvents();
        buildCheatSheet();

        // On initialise le composant.
        _$scoreInput.trigger("change");
    };

    return _module;
})();

$(function() {
    originGuildBossCalculator.init();
})