/** Permet de calculer le niveau et les PVs à retirer au boss de guilde en fonction d'un score. */
var originGuildBossCalculator = (function() {
    "use strict";

    let _module = {};

    let _guildBossLevels = [
        { level: 1, health: 2090121, totalHealth: 2090121 },
        { level: 2, health: 2923402, totalHealth: 5013523 },
        { level: 3, health: 3974208, totalHealth: 8987731 },
        { level: 4, health: 5180389, totalHealth: 14168120 },
        { level: 5, health: 6541945, totalHealth: 20710065 },
        { level: 6, health: 8198714, totalHealth: 28908779 },
        { level: 7, health: 10197308, totalHealth: 39106087 },
        { level: 8, health: 12413428, totalHealth: 51519515 },
        { level: 9, health: 14847073, totalHealth: 66366588 },
        { level: 10, health: 17700232, totalHealth: 84066820 },
        { level: 11, health: 24022303, totalHealth: 108089123 },
        { level: 12, health: 28721553, totalHealth: 136810676 },
        { level: 13, health: 34135530, totalHealth: 170946206 },
        { level: 14, health: 40334151, totalHealth: 211280357 },
        { level: 15, health: 47387335, totalHealth: 258667692 },
        { level: 16, health: 54999870, totalHealth: 313667562 },
        { level: 17, health: 63560194, totalHealth: 377227756 },
        { level: 18, health: 73549970, totalHealth: 450777726 },
        { level: 19, health: 84238935, totalHealth: 535016661 },
        { level: 20, health: 96543801, totalHealth: 631560462 }
    ];

    let _scoreFactor = 10000, // (: ils se sont pas trop cassés la tête, et ça fait plaisir)
        _minScore = 0,
        _maxTheoreticalScore = Math.trunc(Math.max.apply(Math, _guildBossLevels.map(l => l.totalHealth)) / _scoreFactor);

    let _$scoreInput = null,
        _$levelSpan = null,
        _$limitBreakSup = null,
        _$currentHealthBlock = null,
        _$currentHealthSpan = null,
        _$targetScoreButtons = null;

    /** Initialise les membres internes. */
    function initMembers() {
        _$scoreInput = $("#scoreInput");
        _$levelSpan = $(".bdg-level");
        _$limitBreakSup = $(".bdg-limit-break");
        _$currentHealthBlock = $(".bdg-health-current-level");
        _$currentHealthSpan = $(".bdg-health-current-percentage");
        _$targetScoreButtons = $(".btn-target-score");
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